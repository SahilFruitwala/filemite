/**
 * PDF operations that create or change page content: images to PDF, pages to
 * images, drawing marks onto pages and redaction. Runs inside the engine Web
 * Worker in the browser, and directly under Node for tests. Page indices are 0-based.
 */
import * as mupdf from "mupdf";

import { getPageCount, PdfError, save, withPdf } from "./document";
import { layoutImagePage, type ImagePageOptions } from "./image-pages";
import {
  arrowGeometry,
  encodeLatin,
  hexToRgb,
  stepText,
  TEXT_BASELINE,
  TEXT_LINE_HEIGHT,
  type Overlay,
  type RedactBox,
} from "./overlay";
import type { PdfSource } from "./types";

type Progress = (done: number, total: number) => void;

// ---------------------------------------------------------------------------
// Images to PDF
// ---------------------------------------------------------------------------

/** `images` are PNG or JPEG files; each becomes one page. */
export function imagesToPdf(
  images: Uint8Array[],
  options: ImagePageOptions,
  onProgress?: Progress
): Uint8Array {
  if (!images.length) throw new PdfError("Add at least one image.", "invalid");
  const output = new mupdf.PDFDocument();
  try {
    images.forEach((bytes, index) => {
      let image: mupdf.Image;
      try {
        image = new mupdf.Image(bytes);
      } catch {
        throw new PdfError(`Image ${index + 1} couldn’t be read.`, "invalid");
      }
      try {
        const layout = layoutImagePage(image.getWidth(), image.getHeight(), options);
        const xobjects = output.newDictionary();
        xobjects.put("Im0", output.addImage(image));
        const resources = output.newDictionary();
        resources.put("XObject", xobjects);
        const { x, y, width, height } = layout;
        const page = output.addPage(
          [0, 0, layout.pageWidth, layout.pageHeight],
          0,
          output.addObject(resources),
          `q ${num(width)} 0 0 ${num(height)} ${num(x)} ${num(y)} cm /Im0 Do Q`
        );
        output.insertPage(-1, page);
      } finally {
        image.destroy();
      }
      onProgress?.(index + 1, images.length);
    });
    return save(output);
  } finally {
    output.destroy();
  }
}

// ---------------------------------------------------------------------------
// Pages to images
// ---------------------------------------------------------------------------

export type RenderImageOptions = {
  dpi: number;
  format: "png" | "jpeg";
  /** JPEG quality, 1–100. */
  quality: number;
};

/** The largest page, in pixels, we render; beyond this the resolution is lowered. */
const MAX_RENDER_PIXELS = 60_000_000;

export function renderPagesToImages(
  source: PdfSource,
  pages: number[],
  options: RenderImageOptions,
  onProgress?: Progress
): Uint8Array[] {
  return withPdf(source, (doc) => {
    assertPageList(pages, getPageCount(doc));
    const results: Uint8Array[] = [];
    pages.forEach((pageIndex, position) => {
      const page = doc.loadPage(pageIndex);
      try {
        const [x0, y0, x1, y1] = page.getBounds();
        let scale = options.dpi / 72;
        const pixels = (x1 - x0) * (y1 - y0) * scale * scale;
        if (pixels > MAX_RENDER_PIXELS) scale *= Math.sqrt(MAX_RENDER_PIXELS / pixels);
        const pixmap = page.toPixmap(
          mupdf.Matrix.scale(scale, scale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true
        );
        try {
          results.push(
            (options.format === "png" ? pixmap.asPNG() : pixmap.asJPEG(options.quality)).slice()
          );
        } finally {
          pixmap.destroy();
        }
      } finally {
        page.destroy();
      }
      onProgress?.(position + 1, pages.length);
    });
    return results;
  });
}

function assertPageList(pages: number[], pageCount: number) {
  if (!pages.length) throw new PdfError("Select at least one page.", "invalid");
  for (const page of pages) {
    if (!Number.isInteger(page) || page < 0 || page >= pageCount) {
      throw new PdfError(`Page ${page + 1} doesn’t exist in this PDF.`, "invalid");
    }
  }
}

/** Size of a page as displayed (rotation applied), in points. */
export function getPageSize(doc: mupdf.PDFDocument, pageIndex: number): [number, number] {
  const page = doc.loadPage(pageIndex);
  try {
    const [x0, y0, x1, y1] = page.getBounds();
    return [x1 - x0, y1 - y0];
  } finally {
    page.destroy();
  }
}

// ---------------------------------------------------------------------------
// Marks on pages
// ---------------------------------------------------------------------------

type Matrix = mupdf.Matrix;

function invert([a, b, c, d, e, f]: Matrix): Matrix {
  const det = a * d - b * c;
  if (!det) return [1, 0, 0, 1, 0, 0];
  return [
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  ];
}

/** Trims a number for a content stream: enough precision, no trailing zeros. */
function num(value: number): string {
  const text = value.toFixed(3).replace(/\.?0+$/, "");
  return text === "-0" || text === "" ? "0" : text;
}

function rgb(color: string): string {
  return hexToRgb(color).map(num).join(" ");
}

const KAPPA = 0.5522847498;

function ellipsePath(x: number, y: number, w: number, h: number): string {
  const rx = w / 2;
  const ry = h / 2;
  const cx = x + rx;
  const cy = y + ry;
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return [
    `${num(cx + rx)} ${num(cy)} m`,
    `${num(cx + rx)} ${num(cy + oy)} ${num(cx + ox)} ${num(cy + ry)} ${num(cx)} ${num(cy + ry)} c`,
    `${num(cx - ox)} ${num(cy + ry)} ${num(cx - rx)} ${num(cy + oy)} ${num(cx - rx)} ${num(cy)} c`,
    `${num(cx - rx)} ${num(cy - oy)} ${num(cx - ox)} ${num(cy - ry)} ${num(cx)} ${num(cy - ry)} c`,
    `${num(cx + ox)} ${num(cy - ry)} ${num(cx + rx)} ${num(cy - oy)} ${num(cx + rx)} ${num(cy)} c`,
    "h",
  ].join(" ");
}

function pdfString(bytes: number[]): string {
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
}

/** Per-document counter so resource names never collide when several pages share a resource dictionary. */
let resourceCounter = 0;

function subDictionary(doc: mupdf.PDFDocument, resources: mupdf.PDFObject, key: string) {
  let dictionary = resources.get(key);
  if (dictionary.isNull()) {
    dictionary = doc.newDictionary();
    resources.put(key, dictionary);
  }
  return dictionary;
}

/**
 * Appends `overlays` to the pages they belong to. Marks are written into the
 * page content (not as annotations) so every viewer, printer and extractor
 * shows them the same way. Text uses Helvetica.
 */
export function addOverlays(source: PdfSource, overlays: Overlay[]): Uint8Array {
  if (!overlays.length) throw new PdfError("Add something to the PDF first.", "invalid");
  return withPdf(source, (doc) => {
    const pageCount = getPageCount(doc);
    const byPage = new Map<number, Overlay[]>();
    for (const overlay of overlays) {
      if (!Number.isInteger(overlay.page) || overlay.page < 0 || overlay.page >= pageCount) {
        throw new PdfError(`Page ${overlay.page + 1} doesn’t exist in this PDF.`, "invalid");
      }
      byPage.set(overlay.page, [...(byPage.get(overlay.page) ?? []), overlay]);
    }

    let fontRef: mupdf.PDFObject | null = null;
    const font = () => (fontRef ??= doc.addSimpleFont(new mupdf.Font("Helvetica"), "Latin"));

    for (const [pageIndex, items] of byPage) {
      const page = doc.loadPage(pageIndex);
      try {
        drawOverlays(doc, page, items, font);
      } finally {
        page.destroy();
      }
    }
    return save(doc);
  });
}

function drawOverlays(
  doc: mupdf.PDFDocument,
  page: mupdf.PDFPage,
  items: Overlay[],
  font: () => mupdf.PDFObject
) {
  const pageObject = page.getObject();
  let resources = pageObject.getInheritable("Resources");
  if (resources.isNull()) {
    resources = doc.addObject(doc.newDictionary());
  }
  // The page needs its own reference so the new names are found even when the original was inherited.
  pageObject.put("Resources", resources);

  const id = ++resourceCounter;
  const fontName = `FmFont${id}`;
  const multiplyName = `FmMul${id}`;
  let usesFont = false;
  let usesMultiply = false;

  const commands: string[] = [];
  items.forEach((item, index) => {
    switch (item.kind) {
      case "text": {
        usesFont = true;
        const lines = item.text.split("\n");
        const lineHeight = item.size * TEXT_LINE_HEIGHT;
        commands.push(`BT /${fontName} ${num(item.size)} Tf ${rgb(item.color)} rg`);
        lines.forEach((line, lineIndex) => {
          const baseline = item.y + item.size * TEXT_BASELINE + lineIndex * lineHeight;
          // The page is drawn y-down, so the text matrix flips the glyphs upright again.
          commands.push(
            `1 0 0 -1 ${num(item.x)} ${num(baseline)} Tm ${pdfString(encodeLatin(line).bytes)} Tj`
          );
        });
        commands.push("ET");
        break;
      }
      case "mark": {
        const { x, y, w, h } = item;
        const width = Math.max(1, Math.min(w, h) * 0.14);
        commands.push(`q ${rgb(item.color)} RG ${num(width)} w 1 J 1 j`);
        if (item.mark === "check") {
          commands.push(
            `${num(x + w * 0.12)} ${num(y + h * 0.55)} m ${num(x + w * 0.38)} ${num(y + h * 0.82)} l ${num(x + w * 0.88)} ${num(y + h * 0.18)} l S`
          );
        } else {
          commands.push(
            `${num(x + w * 0.15)} ${num(y + h * 0.15)} m ${num(x + w * 0.85)} ${num(y + h * 0.85)} l S`,
            `${num(x + w * 0.85)} ${num(y + h * 0.15)} m ${num(x + w * 0.15)} ${num(y + h * 0.85)} l S`
          );
        }
        commands.push("Q");
        break;
      }
      case "rect":
      case "ellipse": {
        const path =
          item.kind === "rect"
            ? `${num(item.x)} ${num(item.y)} ${num(item.w)} ${num(item.h)} re`
            : ellipsePath(item.x, item.y, item.w, item.h);
        const paint = item.fill ? (item.strokeWidth > 0 ? "B" : "f") : item.strokeWidth > 0 ? "S" : "n";
        commands.push(
          `q ${rgb(item.color)} RG ${item.fill ? `${rgb(item.fill)} rg ` : ""}${num(item.strokeWidth)} w ${path} ${paint} Q`
        );
        break;
      }
      case "highlight": {
        usesMultiply = true;
        commands.push(
          `q /${multiplyName} gs ${rgb(item.color)} rg ${num(item.x)} ${num(item.y)} ${num(item.w)} ${num(item.h)} re f Q`
        );
        break;
      }
      case "line": {
        const { x1, y1, x2, y2, strokeWidth } = item;
        commands.push(
          `q ${rgb(item.color)} RG ${rgb(item.color)} rg ${num(strokeWidth)} w 1 J 1 j`
        );
        if (item.arrow) {
          const { shaftEnd, head } = arrowGeometry(x1, y1, x2, y2, strokeWidth);
          commands.push(
            `${num(x1)} ${num(y1)} m ${num(shaftEnd[0])} ${num(shaftEnd[1])} l S`,
            `${num(head[0][0])} ${num(head[0][1])} m ${num(head[1][0])} ${num(head[1][1])} l ${num(head[2][0])} ${num(head[2][1])} l h f`
          );
        } else {
          commands.push(`${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
        }
        commands.push("Q");
        break;
      }
      case "pen": {
        const [first, ...rest] = item.points;
        if (!first) break;
        const path = rest.length
          ? rest.map(([px, py]) => `${num(px)} ${num(py)} l`).join(" ")
          : `${num(first[0])} ${num(first[1])} l`;
        commands.push(
          `q ${rgb(item.color)} RG ${num(item.strokeWidth)} w 1 J 1 j ${num(first[0])} ${num(first[1])} m ${path} S Q`
        );
        break;
      }
      case "step": {
        usesFont = true;
        const text = stepText(item, item.number);
        commands.push(
          `q ${rgb(item.color)} rg ${ellipsePath(item.x, item.y, item.w, item.h)} f Q`,
          `BT /${fontName} ${num(text.size)} Tf 1 g 1 0 0 -1 ${num(text.x)} ${num(text.baseline)} Tm ${pdfString(encodeLatin(String(item.number)).bytes)} Tj ET`
        );
        break;
      }
      case "image": {
        const name = `FmIm${id}x${index}`;
        const xobjects = subDictionary(doc, resources, "XObject");
        xobjects.put(name, doc.addImage(new mupdf.Image(item.png)));
        commands.push(
          `q ${num(item.w)} 0 0 ${num(-item.h)} ${num(item.x)} ${num(item.y + item.h)} cm /${name} Do Q`
        );
        break;
      }
    }
  });

  if (usesFont) subDictionary(doc, resources, "Font").put(fontName, font());
  if (usesMultiply) {
    const state = doc.newDictionary();
    state.put("Type", doc.newName("ExtGState"));
    state.put("BM", doc.newName("Multiply"));
    subDictionary(doc, resources, "ExtGState").put(multiplyName, state);
  }

  // Page space → displayed space, so marks can be positioned the way the preview shows the page.
  const toUser = invert(page.getTransform());
  const content = `q ${toUser.map(num).join(" ")} cm\n${commands.join("\n")}\nQ`;

  const wrapped = doc.newArray();
  wrapped.push(doc.addStream("q", doc.newDictionary()));
  const original = pageObject.get("Contents");
  if (original.isArray()) {
    for (let i = 0; i < original.length; i++) wrapped.push(original.get(i));
  } else if (!original.isNull()) {
    wrapped.push(original);
  }
  wrapped.push(doc.addStream("Q", doc.newDictionary()));
  wrapped.push(doc.addStream(content, doc.newDictionary()));
  pageObject.put("Contents", wrapped);
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/**
 * Permanently removes text, images and line art under `boxes` and paints them
 * black. The content is deleted from the file, not just covered.
 */
export function redactAreas(source: PdfSource, boxes: RedactBox[]): Uint8Array {
  if (!boxes.length) throw new PdfError("Draw a box over what to remove.", "invalid");
  return withPdf(source, (doc) => {
    const pageCount = getPageCount(doc);
    const byPage = new Map<number, RedactBox[]>();
    for (const box of boxes) {
      if (!Number.isInteger(box.page) || box.page < 0 || box.page >= pageCount) {
        throw new PdfError(`Page ${box.page + 1} doesn’t exist in this PDF.`, "invalid");
      }
      byPage.set(box.page, [...(byPage.get(box.page) ?? []), box]);
    }

    for (const [pageIndex, list] of byPage) {
      const page = doc.loadPage(pageIndex);
      try {
        for (const box of list) {
          // Annotation rectangles use displayed-page coordinates, the same space the boxes were drawn in.
          const annotation = page.createAnnotation("Redact");
          annotation.setRect([box.x, box.y, box.x + box.w, box.y + box.h]);
          annotation.update();
        }
        page.applyRedactions(
          true,
          mupdf.PDFPage.REDACT_IMAGE_PIXELS,
          mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED,
          mupdf.PDFPage.REDACT_TEXT_REMOVE
        );
        page.update();
      } finally {
        page.destroy();
      }
    }
    return save(doc);
  });
}
