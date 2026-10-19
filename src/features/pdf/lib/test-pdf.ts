/** Test helper: builds small PDFs where page `i` is `100 + i` points wide. */
import * as mupdf from "mupdf";

export function makePdf(pageCount: number, options: { password?: string } = {}): Uint8Array {
  const doc = new mupdf.PDFDocument();
  try {
    for (let i = 0; i < pageCount; i++) {
      const resources = doc.addObject(doc.newDictionary());
      const contents = `BT /F1 12 Tf 10 10 Td (Page ${i + 1}) Tj ET`;
      const page = doc.addPage([0, 0, 100 + i, 200], 0, resources, contents);
      doc.insertPage(-1, page);
    }
    const encrypt = options.password
      ? `encrypt=aes-256,user-password=${options.password},owner-password=${options.password}`
      : "";
    return doc.saveToBuffer(encrypt).asUint8Array().slice();
  } finally {
    doc.destroy();
  }
}

/** Page widths in order — identifies which fixture pages a result contains. */
export function pageWidths(bytes: Uint8Array): number[] {
  const doc = new mupdf.PDFDocument(bytes);
  try {
    return Array.from({ length: doc.countPages() }, (_, i) => {
      const page = doc.loadPage(i);
      try {
        const [x0, , x1] = page.getBounds();
        return Math.round(x1 - x0);
      } finally {
        page.destroy();
      }
    });
  } finally {
    doc.destroy();
  }
}

/** A one-page PDF with `image` (PNG/JPEG bytes) drawn in a 100pt square. */
export function makePdfWithImage(image: Uint8Array): Uint8Array {
  const doc = new mupdf.PDFDocument();
  try {
    const xobjects = doc.newDictionary();
    xobjects.put("Im0", doc.addImage(new mupdf.Image(image)));
    const resources = doc.newDictionary();
    resources.put("XObject", xobjects);
    const page = doc.addPage(
      [0, 0, 200, 200],
      0,
      doc.addObject(resources),
      "q 100 0 0 100 20 20 cm /Im0 Do Q"
    );
    doc.insertPage(-1, page);
    return doc.saveToBuffer("").asUint8Array().slice();
  } finally {
    doc.destroy();
  }
}
