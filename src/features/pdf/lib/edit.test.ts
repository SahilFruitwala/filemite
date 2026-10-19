import { describe, expect, test } from "vitest";

import {
  addOverlays,
  getPageSize,
  imagesToPdf,
  redactAreas,
  renderPagesToImages,
} from "./edit";
import { openPdf } from "./document";
import { DEFAULT_IMAGE_PAGE_OPTIONS, layoutImagePage } from "./image-pages";
import { encodeLatin, hasUnsupportedCharacters, hexToRgb, type Overlay } from "./overlay";
import { inkedPixels, makePdf, makePng, makePdfWithImage, makeTextPdf, pageTexts, pageWidths } from "./test-pdf";

const source = (bytes: Uint8Array) => ({ bytes });

const RED_PNG = makePng(20, 20);

describe("layoutImagePage", () => {
  test("fit keeps the image's own proportions and adds margins around it", () => {
    const layout = layoutImagePage(400, 200, { pageSize: "fit", orientation: "auto", margin: "small" });
    expect(layout.width / layout.height).toBeCloseTo(2);
    expect(layout.pageWidth).toBeCloseTo(layout.width + 36);
    expect(layout.x).toBe(18);
  });

  test("fit never makes a page longer than 20 inches", () => {
    const layout = layoutImagePage(8000, 6000, { pageSize: "fit", orientation: "auto", margin: "none" });
    expect(Math.max(layout.pageWidth, layout.pageHeight)).toBeLessThanOrEqual(1440);
  });

  test("auto orientation turns the page to suit the image", () => {
    const wide = layoutImagePage(300, 100, { ...DEFAULT_IMAGE_PAGE_OPTIONS, pageSize: "a4" });
    const tall = layoutImagePage(100, 300, { ...DEFAULT_IMAGE_PAGE_OPTIONS, pageSize: "a4" });
    expect(wide.pageWidth).toBeGreaterThan(wide.pageHeight);
    expect(tall.pageWidth).toBeLessThan(tall.pageHeight);
  });

  test("an image is centred inside the margins and never spills past them", () => {
    const layout = layoutImagePage(100, 100, { pageSize: "letter", orientation: "portrait", margin: "large" });
    expect(layout.x).toBeCloseTo((layout.pageWidth - layout.width) / 2);
    expect(layout.x).toBeGreaterThanOrEqual(36 - 0.001);
    expect(layout.y + layout.height).toBeLessThanOrEqual(layout.pageHeight - 36 + 0.001);
  });
});

describe("imagesToPdf", () => {
  test("makes one page per image and reports progress", () => {
    const progress: number[] = [];
    const out = imagesToPdf([RED_PNG, RED_PNG, RED_PNG], DEFAULT_IMAGE_PAGE_OPTIONS, (done) =>
      progress.push(done)
    );
    expect(pageWidths(out)).toEqual([595, 595, 595]);
    expect(progress).toEqual([1, 2, 3]);
    // The image is actually drawn.
    expect(inkedPixels(out, 0)).toBeGreaterThan(1000);
  });

  test("rejects an empty list and unreadable images", () => {
    expect(() => imagesToPdf([], DEFAULT_IMAGE_PAGE_OPTIONS)).toThrow(
      expect.objectContaining({ code: "invalid" })
    );
    expect(() => imagesToPdf([new Uint8Array([1, 2, 3])], DEFAULT_IMAGE_PAGE_OPTIONS)).toThrow(
      expect.objectContaining({ code: "invalid" })
    );
  });
});

describe("renderPagesToImages", () => {
  test("renders the chosen pages as PNG or JPEG", () => {
    const pdf = makePdf(3);
    const png = renderPagesToImages(source(pdf), [2, 0], { dpi: 144, format: "png", quality: 90 });
    expect(png).toHaveLength(2);
    expect(Array.from(png[0].slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const jpeg = renderPagesToImages(source(pdf), [1], { dpi: 72, format: "jpeg", quality: 80 });
    expect(Array.from(jpeg[0].slice(0, 2))).toEqual([0xff, 0xd8]);
  });

  test("scales resolution by dpi", () => {
    const pdf = makePdfWithImage(RED_PNG);
    const [low] = renderPagesToImages(source(pdf), [0], { dpi: 72, format: "png", quality: 90 });
    const [high] = renderPagesToImages(source(pdf), [0], { dpi: 216, format: "png", quality: 90 });
    const width = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset).getUint32(16);
    expect(width(low)).toBe(200);
    expect(width(high)).toBe(600);
  });

  test("rejects pages that don't exist", () => {
    expect(() =>
      renderPagesToImages(source(makePdf(2)), [5], { dpi: 72, format: "png", quality: 90 })
    ).toThrow(expect.objectContaining({ code: "invalid" }));
  });
});

describe("overlay helpers", () => {
  test("hexToRgb reads six-digit colours and falls back to black", () => {
    expect(hexToRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(hexToRgb("red")).toEqual([0, 0, 0]);
  });

  test("encodeLatin keeps Latin-1 and Windows punctuation and flags the rest", () => {
    expect(encodeLatin("Aé€").bytes).toEqual([0x41, 0xe9, 0x80]);
    expect(encodeLatin("日本")).toEqual({ bytes: [0x3f, 0x3f], lost: true });
    expect(hasUnsupportedCharacters("fine\nstill fine")).toBe(false);
    expect(hasUnsupportedCharacters("fine\n日本")).toBe(true);
  });
});

describe("addOverlays", () => {
  const every = (page: number): Overlay[] => [
    { kind: "text", page, x: 20, y: 20, size: 18, color: "#cc0000", text: "Hello\nWorld" },
    { kind: "mark", page, x: 20, y: 80, w: 30, h: 30, mark: "check", color: "#007700" },
    { kind: "mark", page, x: 60, y: 80, w: 30, h: 30, mark: "cross", color: "#007700" },
    { kind: "rect", page, x: 20, y: 130, w: 60, h: 30, color: "#0000cc", fill: null, strokeWidth: 2 },
    { kind: "ellipse", page, x: 100, y: 130, w: 60, h: 30, color: "#0000cc", fill: "#ffee00", strokeWidth: 1 },
    { kind: "highlight", page, x: 20, y: 180, w: 120, h: 20, color: "#ffee00" },
    { kind: "line", page, x1: 20, y1: 220, x2: 140, y2: 260, color: "#000000", strokeWidth: 2, arrow: true },
    { kind: "image", page, x: 160, y: 20, w: 40, h: 40, png: RED_PNG },
    { kind: "pen", page, points: [[20, 300], [60, 330], [100, 300], [140, 330]], color: "#000000", strokeWidth: 3 },
    { kind: "step", page, x: 200, y: 300, w: 30, h: 30, number: 12, color: "#cc0000" },
  ];

  test("draws every kind of mark and keeps the existing page text", () => {
    const pdf = makeTextPdf(2);
    const out = addOverlays(source(pdf), every(1));
    // The second page now has ink where we drew; the first is untouched.
    expect(inkedPixels(out, 1, [20, 20, 140, 60])).toBeGreaterThan(100);
    expect(inkedPixels(out, 0, [20, 20, 140, 60])).toBe(0);
    expect(pageTexts(out)[1]).toContain("Secret 2");
    expect(pageTexts(out)[1]).toContain("Hello");
    expect(pageTexts(out)[1]).toContain("World");
    expect(pageTexts(out)[1]).toContain("12");
    expect(inkedPixels(out, 1, [20, 295, 145, 335])).toBeGreaterThan(100);
    expect(inkedPixels(out, 1, [200, 300, 230, 330])).toBeGreaterThan(500);
    expect(pageTexts(out)[0]).toBe("Secret 1");
  });

  test("puts marks where the preview shows them, on rotated pages too", () => {
    for (const rotate of [0, 90, 180, 270] as const) {
      const pdf = makeTextPdf(1, { rotate });
      const [width, height] = (() => {
        const doc = openPdf(source(pdf));
        try {
          return getPageSize(doc, 0);
        } finally {
          doc.destroy();
        }
      })();
      expect([width, height]).toEqual(rotate % 180 ? [400, 300] : [300, 400]);

      const box: [number, number, number, number] = [10, 10, 50, 40];
      const out = addOverlays(source(pdf), [
        { kind: "rect", page: 0, x: 10, y: 10, w: 40, h: 30, color: "#000000", fill: "#000000", strokeWidth: 0 },
      ]);
      // The rendered page is `width` × `height` pixels at 72 dpi, so the filled rectangle must cover its own area.
      expect(inkedPixels(out, 0, box)).toBeGreaterThan(40 * 30 * 0.95);
      // And leave the opposite corner blank.
      expect(inkedPixels(out, 0, [width - 50, height - 40, width - 10, height - 10])).toBe(0);
    }
  });

  test("works when the page's box doesn't start at the origin", () => {
    const pdf = makeTextPdf(1, { origin: [100, 200] });
    const out = addOverlays(source(pdf), [
      { kind: "rect", page: 0, x: 10, y: 10, w: 40, h: 30, color: "#000000", fill: "#000000", strokeWidth: 0 },
    ]);
    expect(inkedPixels(out, 0, [10, 10, 50, 40])).toBeGreaterThan(40 * 30 * 0.95);
  });

  test("a highlight leaves the text under it readable", () => {
    const pdf = makeTextPdf(1);
    const out = addOverlays(source(pdf), [
      { kind: "highlight", page: 0, x: 40, y: 70, w: 200, h: 40, color: "#ffff00" },
    ]);
    expect(pageTexts(out)[0]).toBe("Secret 1");
  });

  test("rejects an empty list and pages that don't exist", () => {
    expect(() => addOverlays(source(makeTextPdf(1)), [])).toThrow(
      expect.objectContaining({ code: "invalid" })
    );
    expect(() => addOverlays(source(makeTextPdf(1)), every(3))).toThrow(
      expect.objectContaining({ code: "invalid" })
    );
  });
});

describe("redactAreas", () => {
  test("removes the text under a box and keeps the rest", () => {
    // "Secret 1" is drawn at y=300 up from the bottom of a 400pt page, i.e. about y=76–100 from the top.
    const pdf = makeTextPdf(2);
    expect(pageTexts(pdf)[0]).toBe("Secret 1");
    const out = redactAreas(source(pdf), [{ page: 0, x: 40, y: 60, w: 200, h: 50 }]);
    expect(pageTexts(out)[0]).toBe("");
    expect(pageTexts(out)[1]).toBe("Secret 2");
    // The area is painted black.
    expect(inkedPixels(out, 0, [40, 60, 240, 110])).toBeGreaterThan(200 * 50 * 0.9);
  });

  test("finds the right spot on a rotated page", () => {
    const pdf = makeTextPdf(1, { rotate: 90 });
    // Cover the whole displayed page: nothing may be left.
    const out = redactAreas(source(pdf), [{ page: 0, x: 0, y: 0, w: 400, h: 300 }]);
    expect(pageTexts(out)[0]).toBe("");
  });

  test("a box elsewhere leaves the text alone", () => {
    const pdf = makeTextPdf(1);
    const out = redactAreas(source(pdf), [{ page: 0, x: 0, y: 300, w: 100, h: 50 }]);
    expect(pageTexts(out)[0]).toBe("Secret 1");
  });

  test("rejects an empty list and pages that don't exist", () => {
    expect(() => redactAreas(source(makeTextPdf(1)), [])).toThrow(
      expect.objectContaining({ code: "invalid" })
    );
    expect(() => redactAreas(source(makeTextPdf(1)), [{ page: 4, x: 0, y: 0, w: 5, h: 5 }])).toThrow(
      expect.objectContaining({ code: "invalid" })
    );
  });
});
