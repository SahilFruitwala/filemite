/** Test helper: builds small PDFs where page `i` is `100 + i` points wide. */
import { zlibSync } from "fflate";
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

/** A PDF whose pages each say "Secret <n>" in Helvetica, so text extraction and redaction can be checked. */
export function makeTextPdf(
  pageCount: number,
  options: { rotate?: 0 | 90 | 180 | 270; origin?: [number, number] } = {}
): Uint8Array {
  const doc = new mupdf.PDFDocument();
  try {
    const fonts = doc.newDictionary();
    fonts.put("F1", doc.addSimpleFont(new mupdf.Font("Helvetica"), "Latin"));
    const resources = doc.newDictionary();
    resources.put("Font", fonts);
    const [ox, oy] = options.origin ?? [0, 0];
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage(
        [ox, oy, ox + 300, oy + 400],
        options.rotate ?? 0,
        doc.addObject(resources),
        `BT /F1 24 Tf ${ox + 50} ${oy + 300} Td (Secret ${i + 1}) Tj ET`
      );
      doc.insertPage(-1, page);
    }
    return doc.saveToBuffer("").asUint8Array().slice();
  } finally {
    doc.destroy();
  }
}

/** All text on each page, for asserting what survives an edit. */
export function pageTexts(bytes: Uint8Array): string[] {
  const doc = new mupdf.PDFDocument(bytes);
  try {
    return Array.from({ length: doc.countPages() }, (_, i) => {
      const page = doc.loadPage(i);
      try {
        return page.toStructuredText("").asText().trim();
      } finally {
        page.destroy();
      }
    });
  } finally {
    doc.destroy();
  }
}

/** Renders a page to a small RGB pixmap and reports how many pixels are not white. */
export function inkedPixels(
  bytes: Uint8Array,
  pageIndex: number,
  region?: [number, number, number, number]
): number {
  const doc = new mupdf.PDFDocument(bytes);
  try {
    const page = doc.loadPage(pageIndex);
    try {
      const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false, true);
      try {
        const width = pixmap.getWidth();
        const height = pixmap.getHeight();
        const samples = pixmap.getPixels();
        const [rx0, ry0, rx1, ry1] = region ?? [0, 0, width, height];
        let count = 0;
        for (let y = ry0; y < Math.min(ry1, height); y++) {
          for (let x = rx0; x < Math.min(rx1, width); x++) {
            const i = (y * width + x) * 3;
            if (samples[i] < 250 || samples[i + 1] < 250 || samples[i + 2] < 250) count++;
          }
        }
        return count;
      } finally {
        pixmap.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    doc.destroy();
  }
}

/** A solid-colour PNG, for tests that need a real image. */
export function makePng(width: number, height: number, color: [number, number, number] = [200, 30, 30]): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) raw.set(color, y * (width * 3 + 1) + 1 + x * 3);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Uint8Array) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
    return out;
  };
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);
  const parts = [
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlibSync(raw)),
    chunk("IEND", new Uint8Array()),
  ];
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
