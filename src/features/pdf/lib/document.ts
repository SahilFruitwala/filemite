/** Opening, validating and saving MuPDF documents. */
import * as mupdf from "mupdf";

import { isOutOfMemory, TOO_LARGE_MESSAGE } from "./errors";
import type { PdfErrorCode, PdfSource } from "./types";

export { isOutOfMemory } from "./errors";

/**
 * Lossless write options used for every output:
 * deduplicate and drop unused objects, compress streams, pack objects into
 * object streams, and remove encryption (the user has already unlocked it).
 */
const SAVE_OPTIONS =
  "garbage=deduplicate,compress,compress-fonts,compress-images,objstms,encrypt=no";

export class PdfError extends Error {
  constructor(
    message: string,
    readonly code: PdfErrorCode
  ) {
    super(message);
    this.name = "PdfError";
  }
}

export function openPdf(source: PdfSource): mupdf.PDFDocument {
  let doc: mupdf.PDFDocument;
  try {
    doc = new mupdf.PDFDocument(source.bytes);
  } catch (error) {
    if (isOutOfMemory(error)) throw new PdfError(TOO_LARGE_MESSAGE, "unknown");
    throw new PdfError(
      `${label(source)} isn’t a valid PDF or is too damaged to open.`,
      "invalid"
    );
  }

  if (doc.needsPassword()) {
    if (!source.password || !doc.authenticatePassword(source.password)) {
      doc.destroy();
      throw new PdfError(
        source.password
          ? `Incorrect password${source.name ? ` for “${source.name}”` : ""}.`
          : `${label(source)} is password-protected.`,
        "password"
      );
    }
  }

  return doc;
}

function label(source: PdfSource) {
  return source.name ? `“${source.name}”` : "This file";
}

export function save(doc: mupdf.PDFDocument): Uint8Array {
  return doc.saveToBuffer(SAVE_OPTIONS).asUint8Array().slice();
}

export function withPdf<T>(source: PdfSource, fn: (doc: mupdf.PDFDocument) => T): T {
  const doc = openPdf(source);
  try {
    return fn(doc);
  } finally {
    doc.destroy();
  }
}

export function getPageCount(doc: mupdf.PDFDocument): number {
  const count = doc.countPages();
  if (count < 1) {
    throw new PdfError("This PDF doesn’t contain any pages.", "invalid");
  }
  return count;
}
