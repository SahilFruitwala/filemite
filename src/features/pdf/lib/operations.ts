/**
 * PDF operations built on MuPDF. Runs inside the engine Web Worker in the
 * browser, and directly under Node/Bun for tests. Page indices are 0-based.
 */
import * as mupdf from "mupdf";

import { getPageCount, PdfError, save, withPdf } from "./document";
import type { PdfSource } from "./types";

export { getPageCount, openPdf, PdfError } from "./document";
export { compressPdf, compressToTarget, type CompressStats, type TargetResult } from "./compress";

// ---------------------------------------------------------------------------
// Inspect & render
// ---------------------------------------------------------------------------

/** Renders a page to JPEG at the given CSS pixel width. */
export function renderPage(
  doc: mupdf.PDFDocument,
  pageIndex: number,
  width: number
): Uint8Array {
  const page = doc.loadPage(pageIndex);
  try {
    const [x0, , x1] = page.getBounds();
    const scale = width / Math.max(1, x1 - x0);
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(scale, scale),
      mupdf.ColorSpace.DeviceRGB,
      false,
      true
    );
    try {
      return pixmap.asJPEG(82).slice();
    } finally {
      pixmap.destroy();
    }
  } finally {
    page.destroy();
  }
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

type OutlineItem = NonNullable<ReturnType<mupdf.Document["loadOutline"]>>[number];
type LinkDest = Parameters<mupdf.Document["formatLinkURI"]>[0];
type OutlineNode = { title: string; page?: number; children: OutlineNode[] };

function shiftOutline(
  items: OutlineItem[] | null | undefined,
  offset: number
): OutlineNode[] {
  return (items ?? []).map((item) => ({
    title: item.title ?? "Untitled",
    page: item.page !== undefined && item.page >= 0 ? item.page + offset : undefined,
    children: shiftOutline(item.down, offset),
  }));
}

function writeOutline(doc: mupdf.PDFDocument, nodes: OutlineNode[]) {
  const iterator = doc.outlineIterator();
  const insert = (items: OutlineNode[]) => {
    for (const node of items) {
      iterator.insert({
        title: node.title,
        uri:
          node.page === undefined
            ? undefined
            : doc.formatLinkURI({ page: node.page, type: "Fit" } as LinkDest),
        open: false,
      });
      if (node.children.length) {
        // insert() leaves the iterator after the new item; step back into it.
        iterator.prev();
        iterator.down();
        insert(node.children);
        iterator.up();
        iterator.next();
      }
    }
  };
  insert(nodes);
  iterator.destroy();
}

export type MergeOptions = {
  /** Add a top-level bookmark per file, nesting each file's own bookmarks. */
  bookmarks: boolean;
};

export function mergePdfs(
  sources: PdfSource[],
  options: MergeOptions,
  onProgress?: (done: number, total: number) => void
): Uint8Array {
  const output = new mupdf.PDFDocument();
  const outline: OutlineNode[] = [];
  let offset = 0;

  try {
    sources.forEach((source, fileIndex) => {
      withPdf(source, (doc) => {
        const pageCount = getPageCount(doc);
        // One graft map per source so shared fonts/images are copied once.
        const graftMap = output.newGraftMap();
        for (let i = 0; i < pageCount; i++) {
          graftMap.graftPage(-1, doc, i);
        }
        graftMap.destroy();

        if (options.bookmarks) {
          let children: OutlineNode[] = [];
          try {
            children = shiftOutline(doc.loadOutline(), offset);
          } catch {
            // A broken outline shouldn't block the merge.
          }
          outline.push({
            title: (source.name ?? `File ${fileIndex + 1}`).replace(/\.pdf$/i, ""),
            page: offset,
            children,
          });
        }
        offset += pageCount;
      });
      onProgress?.(fileIndex + 1, sources.length);
    });

    if (outline.length) {
      writeOutline(output, outline);
    }
    return save(output);
  } finally {
    output.destroy();
  }
}

// ---------------------------------------------------------------------------
// Split & extract
// ---------------------------------------------------------------------------

function assertPages(pages: number[], pageCount: number) {
  if (!pages.length) {
    throw new PdfError("Select at least one page.", "invalid");
  }
  for (const page of pages) {
    if (!Number.isInteger(page) || page < 0 || page >= pageCount) {
      throw new PdfError(`Page ${page + 1} doesn’t exist in this PDF.`, "invalid");
    }
  }
}

/**
 * Keeps only `pages` (in that order). rearrangePages also remaps bookmarks,
 * links and form fields to the surviving pages and drops the rest.
 */
export function extractPages(source: PdfSource, pages: number[]): Uint8Array {
  return withPdf(source, (doc) => {
    assertPages(pages, getPageCount(doc));
    doc.rearrangePages(pages);
    return save(doc);
  });
}

export function splitPdf(
  source: PdfSource,
  groups: number[][],
  onProgress?: (done: number, total: number) => void
): Uint8Array[] {
  if (!groups.length) {
    throw new PdfError("Nothing to split.", "invalid");
  }
  const pageCount = withPdf(source, getPageCount);
  groups.forEach((group) => assertPages(group, pageCount));

  return groups.map((group, index) => {
    const bytes = extractPages(source, group);
    onProgress?.(index + 1, groups.length);
    return bytes;
  });
}

// ---------------------------------------------------------------------------
// Organize (reorder & rotate)
// ---------------------------------------------------------------------------

export type PageEdit = {
  /** 0-based index of the page in the source document. */
  index: number;
  /** Extra clockwise rotation in degrees (a multiple of 90), added to the page's own. */
  rotate: number;
};

/** MuPDF reports a missing /Rotate as a non-number; /Rotate is inheritable. */
function currentRotation(doc: mupdf.PDFDocument, pageIndex: number): number {
  const value = doc.findPage(pageIndex).getInheritable("Rotate");
  return value.isNumber() ? value.asNumber() : 0;
}

/**
 * Outputs the pages in `edits` order, each rotated by its own amount. Pages
 * left out of `edits` are dropped, like extractPages. Each page may appear once.
 */
export function organizePages(source: PdfSource, edits: PageEdit[]): Uint8Array {
  return withPdf(source, (doc) => {
    const indices = edits.map((edit) => edit.index);
    assertPages(indices, getPageCount(doc));
    if (new Set(indices).size !== indices.length) {
      throw new PdfError("Each page can only be used once.", "invalid");
    }
    if (edits.some((edit) => !Number.isInteger(edit.rotate) || edit.rotate % 90 !== 0)) {
      throw new PdfError("Pages can only be rotated in 90° steps.", "invalid");
    }

    // Indices refer to the original document, so read rotations before reordering.
    const rotations = edits.map((edit) => currentRotation(doc, edit.index));
    doc.rearrangePages(indices);
    edits.forEach((edit, position) => {
      if (edit.rotate % 360 === 0) return;
      const total = (((rotations[position] + edit.rotate) % 360) + 360) % 360;
      doc.findPage(position).put("Rotate", doc.newInteger(total));
    });
    return save(doc);
  });
}
