/** Message contract between the engine client and the engine Web Worker. */
import type { CompressStats, MergeOptions, TargetResult } from "./operations";
import type { CompressOptions, PdfErrorCode, PdfSource } from "./types";

export type EngineApi = {
  /** Opens a document for previews; keeps it in the worker until closed. */
  open(args: { docId: string; source: PdfSource }): { pageCount: number };
  render(args: { docId: string; pageIndex: number; width: number }): Uint8Array;
  close(args: { docId: string }): void;

  merge(args: { sources: PdfSource[]; options: MergeOptions }): Uint8Array;
  split(args: { source: PdfSource; groups: number[][] }): Uint8Array[];
  extract(args: { source: PdfSource; pages: number[] }): Uint8Array;
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
