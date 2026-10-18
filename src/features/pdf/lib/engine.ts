/**
 * Main-thread client for the MuPDF engine. Work runs in two Web Workers so
 * page previews never wait behind a long merge or compression job:
 * - "preview" keeps documents open and renders thumbnails on demand
 * - "jobs" runs merge / split / extract / compress
 */
import type {
  EngineArgs,
  EngineOp,
  EngineRequest,
  EngineResponse,
  EngineResult,
} from "./protocol";
import type { PdfErrorCode } from "./types";

export class EngineError extends Error {
  constructor(
    message: string,
    readonly code: PdfErrorCode
  ) {
    super(message);
    this.name = "EngineError";
  }
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (done: number, total: number) => void;
};

export type CallOptions = {
  transfer?: Transferable[];
  onProgress?: (done: number, total: number) => void;
};

class EngineWorker {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  private start(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./engine.worker.ts", import.meta.url), {
      type: "module",
      name: "micropdf-engine",
    });
    worker.onmessage = (event: MessageEvent<EngineResponse>) => {
      const message = event.data;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      if (message.type === "progress") {
        pending.onProgress?.(message.done, message.total);
        return;
      }
      this.pending.delete(message.id);
      if (message.type === "result") pending.resolve(message.result);
      else pending.reject(new EngineError(message.message, message.code));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.fail(
        "The PDF engine failed to load. Check your connection and reload the page."
      );
    };
    this.worker = worker;
    return worker;
  }

  /** Rejects everything in flight and discards the worker so the next call restarts it. */
  private fail(message: string) {
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) {
      pending.reject(new EngineError(message, "unknown"));
    }
    this.pending.clear();
  }

  warmup() {
    this.start();
  }

  /**
   * Replaces the worker with a fresh one when idle. WASM memory only grows,
   * so recycling after each big job keeps the next one from running out.
   */
  recycle() {
    if (this.pending.size || !this.worker) return;
    this.worker.terminate();
    this.worker = null;
    this.start();
  }

  call<Op extends EngineOp>(
    op: Op,
    args: EngineArgs<Op>,
    options: CallOptions = {}
  ): Promise<EngineResult<Op>> {
    const worker = this.start();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress: options.onProgress,
      });
      const request: EngineRequest = { id, op, args };
      worker.postMessage(request, options.transfer ?? []);
    });
  }
}

const previewWorker = new EngineWorker();
const jobWorker = new EngineWorker();

/** Starts loading the engine (~3.6 MB of WASM) before the user needs it. */
export function warmupEngine() {
  if (typeof window === "undefined") return;
  previewWorker.warmup();
  jobWorker.warmup();
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Preview documents and thumbnails
// ---------------------------------------------------------------------------

export function openDocument(docId: string, file: File, password?: string) {
  return readFileBytes(file).then((bytes) =>
    previewWorker.call(
      "open",
      { docId, source: { bytes, password, name: file.name } },
      { transfer: [bytes.buffer as ArrayBuffer] }
    )
  );
}

const thumbnailCache = new Map<string, string>();

export function closeDocument(docId: string) {
  for (const [key, url] of thumbnailCache) {
    if (key.startsWith(`${docId}:`)) {
      URL.revokeObjectURL(url);
      thumbnailCache.delete(key);
    }
  }
  void previewWorker.call("close", { docId }).catch(() => {});
}

type ThumbnailTask = {
  key: string;
  docId: string;
  pageIndex: number;
  width: number;
  listeners: Set<(url: string | null) => void>;
};

const MAX_RENDERS_IN_FLIGHT = 2;
const queued: ThumbnailTask[] = [];
const inFlight = new Map<string, ThumbnailTask>();

function pumpThumbnails() {
  while (inFlight.size < MAX_RENDERS_IN_FLIGHT && queued.length) {
    // Newest first: during fast scrolling, the latest requests are on screen.
    const task = queued.pop()!;
    inFlight.set(task.key, task);
    previewWorker
      .call("render", {
        docId: task.docId,
        pageIndex: task.pageIndex,
        width: task.width,
      })
      .then(
        (bytes) => {
          const url = URL.createObjectURL(
            new Blob([bytes as BlobPart], { type: "image/jpeg" })
          );
          thumbnailCache.set(task.key, url);
          return url;
        },
        () => null
      )
      .then((url) => {
        inFlight.delete(task.key);
        task.listeners.forEach((listener) => listener(url));
        pumpThumbnails();
      });
  }
}

/**
 * Requests a page thumbnail. Calls `onReady` with an object URL (or null on
 * failure). Returns a cancel function that drops the request if it hasn't
 * started rendering yet.
 */
export function requestThumbnail(
  docId: string,
  pageIndex: number,
  width: number,
  onReady: (url: string | null) => void
): () => void {
  const key = `${docId}:${pageIndex}:${width}`;
  const cached = thumbnailCache.get(key);
  if (cached) {
    onReady(cached);
    return () => {};
  }

  let task = inFlight.get(key) ?? queued.find((item) => item.key === key);
  if (!task) {
    task = { key, docId, pageIndex, width, listeners: new Set() };
    queued.push(task);
  }
  task.listeners.add(onReady);
  pumpThumbnails();

  const current = task;
  return () => {
    current.listeners.delete(onReady);
    if (!current.listeners.size) {
      const index = queued.indexOf(current);
      if (index !== -1) queued.splice(index, 1);
    }
  };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobFile = { file: File; password?: string };

async function runJob<Op extends EngineOp>(
  op: Op,
  args: EngineArgs<Op>,
  options: CallOptions
): Promise<EngineResult<Op>> {
  try {
    return await jobWorker.call(op, args, options);
  } finally {
    jobWorker.recycle();
  }
}

async function toSource({ file, password }: JobFile) {
  return { bytes: await readFileBytes(file), password, name: file.name };
}

function transfers(...sources: { bytes: Uint8Array | ArrayBuffer }[]) {
  return sources.map((source) =>
    source.bytes instanceof Uint8Array ? (source.bytes.buffer as ArrayBuffer) : source.bytes
  );
}

export async function mergeFiles(
  files: JobFile[],
  options: EngineArgs<"merge">["options"],
  onProgress?: CallOptions["onProgress"]
) {
  const sources = await Promise.all(files.map(toSource));
  return runJob(
    "merge",
    { sources, options },
    { transfer: transfers(...sources), onProgress }
  );
}

/** `groups` are 1-based page numbers, one array per output file. */
export async function splitFile(
  file: JobFile,
  groups: number[][],
  onProgress?: CallOptions["onProgress"]
) {
  const source = await toSource(file);
  return runJob(
    "split",
    { source, groups: groups.map((group) => group.map((page) => page - 1)) },
    { transfer: transfers(source), onProgress }
  );
}

/** `pages` are 1-based page numbers, in output order. */
export async function extractFromFile(file: JobFile, pages: number[]) {
  const source = await toSource(file);
  return runJob(
    "extract",
    { source, pages: pages.map((page) => page - 1) },
    { transfer: transfers(source) }
  );
}

export async function compressFile(
  file: JobFile,
  options: EngineArgs<"compress">["options"],
  onProgress?: CallOptions["onProgress"]
) {
  const source = await toSource(file);
  return runJob(
    "compress",
    { source, options },
    { transfer: transfers(source), onProgress }
  );
}

/** Compresses to at most `targetBytes`, keeping as much quality as fits. */
export async function compressFileToTarget(
  file: JobFile,
  targetBytes: number,
  grayscale: boolean,
  onProgress?: CallOptions["onProgress"]
) {
  const source = await toSource(file);
  return runJob(
    "compressToTarget",
    { source, targetBytes, grayscale },
    { transfer: transfers(source), onProgress }
  );
}
