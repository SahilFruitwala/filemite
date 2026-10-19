import { describe, expect, test } from "vitest";

import { getPageCount, openPdf, PdfError } from "./document";
import { extractPages, mergePdfs, renderPage, splitPdf } from "./operations";
import { makePdf, pageWidths } from "./test-pdf";

const source = (bytes: Uint8Array, extra: object = {}) => ({ bytes, ...extra });

describe("openPdf", () => {
  test("opens a valid PDF", () => {
    const doc = openPdf(source(makePdf(3)));
    expect(getPageCount(doc)).toBe(3);
    doc.destroy();
  });

  test("rejects non-PDF bytes with an 'invalid' error naming the file", () => {
    const error = (() => {
      try {
        openPdf(source(new TextEncoder().encode("not a pdf"), { name: "notes.pdf" }));
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(PdfError);
    expect(error).toMatchObject({ code: "invalid" });
    expect((error as Error).message).toContain("notes.pdf");
  });

  test("asks for a password, then accepts the right one and refuses a wrong one", () => {
    const locked = makePdf(2, { password: "s3cret" });
    expect(() => openPdf(source(locked))).toThrow(expect.objectContaining({ code: "password" }));
    expect(() => openPdf(source(locked, { password: "wrong" }))).toThrow(
      expect.objectContaining({ code: "password", message: expect.stringContaining("Incorrect") }),
    );
    const doc = openPdf(source(locked, { password: "s3cret" }));
    expect(getPageCount(doc)).toBe(2);
    doc.destroy();
  });
});

describe("extractPages", () => {
  test("keeps only the chosen pages, in the order given", () => {
    const out = extractPages(source(makePdf(5)), [3, 0, 4]);
    expect(pageWidths(out)).toEqual([103, 100, 104]);
  });

  test("removes encryption from the output", () => {
    const out = extractPages(source(makePdf(2, { password: "pw" }), { password: "pw" }), [0]);
    expect(pageWidths(out)).toEqual([100]);
  });

  test.each([[[]], [[5]], [[-1]], [[1.5]]])("rejects invalid selection %j", (pages) => {
    expect(() => extractPages(source(makePdf(3)), pages as number[])).toThrow(
      expect.objectContaining({ code: "invalid" }),
    );
  });
});

describe("splitPdf", () => {
  test("produces one file per group and reports progress", () => {
    const progress: [number, number][] = [];
    const parts = splitPdf(source(makePdf(5)), [[0, 1], [2], [3, 4]], (done, total) =>
      progress.push([done, total]),
    );
    expect(parts.map(pageWidths)).toEqual([[100, 101], [102], [103, 104]]);
    expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
  });

  test("rejects empty and out-of-range groups before doing any work", () => {
    expect(() => splitPdf(source(makePdf(2)), [])).toThrow("Nothing to split");
    expect(() => splitPdf(source(makePdf(2)), [[0], [9]])).toThrow(
      expect.objectContaining({ code: "invalid" }),
    );
  });
});

describe("mergePdfs", () => {
  test("concatenates files in order, with progress", () => {
    const progress: number[] = [];
    const merged = mergePdfs(
      [source(makePdf(2)), source(makePdf(3))],
      { bookmarks: false },
      (done) => progress.push(done),
    );
    expect(pageWidths(merged)).toEqual([100, 101, 100, 101, 102]);
    expect(progress).toEqual([1, 2]);
  });

  test("adds one bookmark per file pointing at its first page", async () => {
    const merged = mergePdfs(
      [source(makePdf(2), { name: "first.pdf" }), source(makePdf(2), { name: "second.pdf" })],
      { bookmarks: true },
    );
    const mupdf = await import("mupdf");
    const doc = new mupdf.PDFDocument(merged);
    const outline = doc.loadOutline() ?? [];
    expect(outline.map((item) => item.title)).toEqual(["first", "second"]);
    expect(outline.map((item) => item.page)).toEqual([0, 2]);
    doc.destroy();
  });

  test("merges a password-protected file when the password is supplied", () => {
    const merged = mergePdfs(
      [source(makePdf(1)), source(makePdf(1, { password: "pw" }), { password: "pw" })],
      { bookmarks: false },
    );
    expect(pageWidths(merged)).toEqual([100, 100]);
  });

  test("surfaces a password error for a locked file without a password", () => {
    expect(() =>
      mergePdfs([source(makePdf(1, { password: "pw" }), { name: "locked.pdf" })], { bookmarks: false }),
    ).toThrow(expect.objectContaining({ code: "password" }));
  });
});

describe("renderPage", () => {
  test("renders a JPEG at the requested width", () => {
    const doc = openPdf(source(makePdf(1)));
    const jpeg = renderPage(doc, 0, 50);
    doc.destroy();
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
  });
});
