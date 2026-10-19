/** Test inputs built on the fly, so the repo carries no binary fixtures. */
import * as mupdf from 'mupdf';
import sharp from 'sharp';

type Upload = { name: string; mimeType: string; buffer: Buffer };

/** A 300×200 blue PNG with a 40×40 red square in the top-left corner — makes orientation visible. */
export async function markerImage(): Promise<Upload> {
  const red = await sharp({
    create: { width: 40, height: 40, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  const buffer = await sharp({
    create: { width: 300, height: 200, channels: 3, background: '#0000ff' },
  })
    .composite([{ input: red, left: 0, top: 0 }])
    .png()
    .toBuffer();
  return { name: 'marker.png', mimeType: 'image/png', buffer };
}

/** A flat mid-grey JPEG of the given size. */
export async function greyImage(width = 1200, height = 800): Promise<Upload> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: '#404040' },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  return { name: 'grey.jpg', mimeType: 'image/jpeg', buffer };
}

/** A PDF whose page `i` is `300 + 50 * i` points wide and 400 tall, so pages can be told apart. */
export function samplePdf(pageCount = 3): Upload {
  const doc = new mupdf.PDFDocument();
  try {
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage(
        [0, 0, 300 + i * 50, 400],
        0,
        doc.addObject(doc.newDictionary()),
        `BT /F1 40 Tf 20 200 Td (Page ${i + 1}) Tj ET`,
      );
      doc.insertPage(-1, page);
    }
    const buffer = Buffer.from(doc.saveToBuffer('').asUint8Array());
    return { name: 'sample.pdf', mimeType: 'application/pdf', buffer };
  } finally {
    doc.destroy();
  }
}

/** Page widths and /Rotate values of a PDF, in page order. */
export function describePdf(bytes: Buffer): { width: number; rotate: number }[] {
  const doc = new mupdf.PDFDocument(bytes);
  try {
    return Array.from({ length: doc.countPages() }, (_, index) => {
      const rotate = doc.findPage(index).getInheritable('Rotate');
      const page = doc.loadPage(index);
      const [x0, , x1] = page.getBounds();
      page.destroy();
      return { width: Math.round(x1 - x0), rotate: rotate.isNumber() ? rotate.asNumber() : 0 };
    });
  } finally {
    doc.destroy();
  }
}

/** Decoded RGB pixels of an image, with a helper to read one. */
export async function readPixels(bytes: Buffer) {
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  return { width: info.width, height: info.height, at };
}

/** A one-page 300×400 PDF that says "Secret 1" in Helvetica, so its text can be extracted. */
export function textPdf(): Upload {
  const doc = new mupdf.PDFDocument();
  try {
    const fonts = doc.newDictionary();
    fonts.put('F1', doc.addSimpleFont(new mupdf.Font('Helvetica'), 'Latin'));
    const resources = doc.newDictionary();
    resources.put('Font', fonts);
    const page = doc.addPage(
      [0, 0, 300, 400],
      0,
      doc.addObject(resources),
      'BT /F1 24 Tf 50 300 Td (Secret 1) Tj ET',
    );
    doc.insertPage(-1, page);
    return {
      name: 'text.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(doc.saveToBuffer('').asUint8Array()),
    };
  } finally {
    doc.destroy();
  }
}

/** The text on each page of a PDF. */
export function pdfText(bytes: Buffer): string[] {
  const doc = new mupdf.PDFDocument(bytes);
  try {
    return Array.from({ length: doc.countPages() }, (_, index) => {
      const page = doc.loadPage(index);
      try {
        return page.toStructuredText('').asText().trim();
      } finally {
        page.destroy();
      }
    });
  } finally {
    doc.destroy();
  }
}

/** Number of non-white pixels in a region of a page, rendered at 72 dpi (1 px = 1 pt). */
export function pdfInk(bytes: Buffer, pageIndex: number, region: [number, number, number, number]) {
  const doc = new mupdf.PDFDocument(bytes);
  try {
    const page = doc.loadPage(pageIndex);
    try {
      const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false, true);
      try {
        const width = pixmap.getWidth();
        const samples = pixmap.getPixels();
        let count = 0;
        for (let y = region[1]; y < region[3]; y++) {
          for (let x = region[0]; x < region[2]; x++) {
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
