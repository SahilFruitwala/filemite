/**
 * On-device image processing: the same jobs as the /api/image endpoints, run
 * in a Web Worker so nothing is uploaded. See browser-image.worker.ts.
 */
import type { ResizeFit } from './resize-plan';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type BrowserImageJob =
  | {
      kind: 'process';
      file: Blob;
      level: 'best' | 'mid' | 'low' | 'lossless';
      /** Output type; omit to keep the original's. */
      format?: ImageFormat;
      width?: number;
      height?: number;
      fit?: ResizeFit;
      /** Keep the original size instead of capping the width at 1920 px. */
      keepSize?: boolean;
    }
  | { kind: 'scrub'; file: Blob }
  | { kind: 'favicons'; file: Blob };

export type BrowserImageReply =
  | { id: number; ok: true; blob: Blob }
  | { id: number; ok: false; error: string };

type Pending = { resolve: (blob: Blob) => void; reject: (error: Error) => void };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./browser-image.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<BrowserImageReply>) => {
    const job = pending.get(data.id);
    pending.delete(data.id);
    if (data.ok) job?.resolve(data.blob);
    else job?.reject(new Error(data.error));
  };
  // The worker failed to load or crashed (usually out of memory): fail what's in flight and start fresh next time.
  worker.onerror = (event) => {
    event.preventDefault();
    worker?.terminate();
    worker = null;
    const message = 'Your browser ran out of memory processing this image. Try a smaller one.';
    pending.forEach((job) => job.reject(new Error(message)));
    pending.clear();
  };
  return worker;
}

function runInBrowser(job: BrowserImageJob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, job });
  });
}

export function processInBrowser(file: File, options: Omit<Extract<BrowserImageJob, { kind: 'process' }>, 'kind' | 'file'>) {
  return runInBrowser({ kind: 'process', file, ...options });
}

export function scrubInBrowser(file: File) {
  return runInBrowser({ kind: 'scrub', file });
}

/** Resolves with a ZIP of the icon set, the same as /api/image/favicon returns. */
export function faviconsInBrowser(file: File) {
  return runInBrowser({ kind: 'favicons', file });
}
