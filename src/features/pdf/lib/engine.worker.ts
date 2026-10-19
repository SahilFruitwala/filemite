/// <reference lib="webworker" />
import type * as mupdf from "mupdf";

import { isOutOfMemory, TOO_LARGE_MESSAGE } from "./errors";
import type {
  EngineApi,
  EngineRequest,
  EngineResponse,
} from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

// MuPDF initialises its WASM with a top-level await. Messages that arrive
// before a listener exists are dropped, so the listener is registered first
// and the engine is loaded lazily behind it. mozjpeg is optional: if it
// fails to load, compression falls back to MuPDF's JPEG encoder.
const engine = Promise.all([
  import("./operations"),
  import("./jpeg-encoder")
    .then((encoder) => encoder.loadJpegEncoder())
    .catch((error) => console.warn("mozjpeg unavailable, using MuPDF JPEG", error)),
]).then(([operations]) => operations);

type Progress = (done: number, total: number) => void;
type Handlers = {
  [Op in keyof EngineApi]: (
    args: Parameters<EngineApi[Op]>[0],
    progress: Progress
  ) => ReturnType<EngineApi[Op]>;
};

/** Documents opened for previewing, keyed by the client's document id. */
const openDocs = new Map<string, mupdf.PDFDocument>();

type Operations = Awaited<typeof engine>;

const createHandlers = ({
  PdfError,
  addOverlays,
  compressPdf,
  compressToTarget,
  extractPages,
  getPageCount,
  getPageSize,
  imagesToPdf,
  mergePdfs,
  openPdf,
  organizePages,
  redactAreas,
  renderPage,
  renderPagesToImages,
  splitPdf,
}: Operations): Handlers => ({
  open({ docId, source }) {
    openDocs.get(docId)?.destroy();
    const doc = openPdf(source);
    try {
      const pageCount = getPageCount(doc);
      openDocs.set(docId, doc);
      return { pageCount };
    } catch (error) {
      doc.destroy();
      throw error;
    }
  },
  render({ docId, pageIndex, width }) {
    const doc = openDocs.get(docId);
    if (!doc) throw new PdfError("This document is no longer open.", "unknown");
    return renderPage(doc, pageIndex, width);
  },
  pageSize({ docId, pageIndex }) {
    const doc = openDocs.get(docId);
    if (!doc) throw new PdfError("This document is no longer open.", "unknown");
    return getPageSize(doc, pageIndex);
  },
  close({ docId }) {
    openDocs.get(docId)?.destroy();
    openDocs.delete(docId);
  },
  merge: ({ sources, options }, progress) => mergePdfs(sources, options, progress),
  split: ({ source, groups }, progress) => splitPdf(source, groups, progress),
  extract: ({ source, pages }) => extractPages(source, pages),
  organize: ({ source, edits }) => organizePages(source, edits),
  imagesToPdf: ({ images, options }, progress) => imagesToPdf(images, options, progress),
  renderImages: ({ source, pages, options }, progress) =>
    renderPagesToImages(source, pages, options, progress),
  overlay: ({ source, overlays }) => addOverlays(source, overlays),
  redact: ({ source, boxes }) => redactAreas(source, boxes),
  compress: ({ source, options }, progress) => compressPdf(source, options, progress),
  compressToTarget: ({ source, targetBytes, grayscale }, progress) =>
    compressToTarget(source, targetBytes, grayscale, progress),
});

const ready = engine.then((ops) => ({ ops, handlers: createHandlers(ops) }));

function collectTransfers(value: unknown, out: Transferable[] = []): Transferable[] {
  if (value instanceof Uint8Array) {
    out.push(value.buffer as ArrayBuffer);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectTransfers(item, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectTransfers(item, out));
  }
  return out;
}

function reply(message: EngineResponse, transfer: Transferable[] = []) {
  self.postMessage(message, transfer);
}

self.onmessage = async (event: MessageEvent<EngineRequest>) => {
  const { id, op, args } = event.data;
  let loaded: Awaited<typeof ready>;
  try {
    loaded = await ready;
  } catch (error) {
    console.error(error);
    reply({
      id,
      type: "error",
      code: "unknown",
      message: "The PDF engine failed to load. Check your connection and reload the page.",
    });
    return;
  }
  const { ops, handlers } = loaded;
  try {
    const handler = handlers[op] as (args: unknown, progress: Progress) => unknown;
    const result = handler(args, (done, total) =>
      reply({ id, type: "progress", done, total })
    );
    reply({ id, type: "result", result }, collectTransfers(result));
  } catch (error) {
    if (error instanceof ops.PdfError) {
      reply({ id, type: "error", message: error.message, code: error.code });
    } else {
      console.error(error);
      reply({
        id,
        type: "error",
        code: "unknown",
        message: isOutOfMemory(error)
          ? TOO_LARGE_MESSAGE
          : "Something went wrong while processing this PDF.",
      });
    }
  }
};
