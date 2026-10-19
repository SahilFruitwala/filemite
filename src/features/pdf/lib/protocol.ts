/** Message contract between the engine client and the engine Web Worker. */
import type { ImagePageOptions } from "./image-pages";
import type {
  CompressStats,
  MergeOptions,
  PageEdit,
  RenderImageOptions,
  TargetResult,
} from "./operations";
import type { Overlay, RedactBox } from "./overlay";
import type { CompressOptions, PdfErrorCode, PdfSource } from "./types";

export type EngineApi = {
  /** Opens a document for previews; keeps it in the worker until closed. */
  open(args: { docId: string; source: PdfSource }): { pageCount: number };
  render(args: { docId: string; pageIndex: number; width: number }): Uint8Array;
  close(args: { docId: string }): void;
  /** Displayed size of a page of an open document, in points. */
  pageSize(args: { docId: string; pageIndex: number }): [number, number];

  merge(args: { sources: PdfSource[]; options: MergeOptions }): Uint8Array;
  split(args: { source: PdfSource; groups: number[][] }): Uint8Array[];
  extract(args: { source: PdfSource; pages: number[] }): Uint8Array;
  organize(args: { source: PdfSource; edits: PageEdit[] }): Uint8Array;
  imagesToPdf(args: { images: Uint8Array[]; options: ImagePageOptions }): Uint8Array;
  renderImages(args: {
    source: PdfSource;
    pages: number[];
    options: RenderImageOptions;
  }): Uint8Array[];
  overlay(args: { source: PdfSource; overlays: Overlay[] }): Uint8Array;
  redact(args: { source: PdfSource; boxes: RedactBox[] }): Uint8Array;
  compress(args: {
    source: PdfSource;
    options: CompressOptions;
  }): { bytes: Uint8Array; stats: CompressStats };
  compressToTarget(args: {
    source: PdfSource;
    targetBytes: number;
    grayscale: boolean;
  }): TargetResult;
};

export type EngineOp = keyof EngineApi;
export type EngineArgs<Op extends EngineOp> = Parameters<EngineApi[Op]>[0];
export type EngineResult<Op extends EngineOp> = ReturnType<EngineApi[Op]>;

export type EngineRequest = { id: number; op: EngineOp; args: unknown };

export type EngineResponse =
  | { id: number; type: "result"; result: unknown }
  | { id: number; type: "error"; message: string; code: PdfErrorCode }
  | { id: number; type: "progress"; done: number; total: number };
