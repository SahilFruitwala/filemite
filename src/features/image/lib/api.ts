import { IMAGE_UPLOAD_CONCURRENCY } from '@/lib/limits';

/** Longest we'll wait on a Retry-After before giving up and showing the error. */
const MAX_RETRY_WAIT_MS = 15_000;
const MAX_RETRIES = 2;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Seconds the server asked us to wait, when it said so. */
    readonly retryAfter = 0,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Page-wide cap on uploads in flight, shared by every tool and batch, so the
 * browser never sends more at once than the server allows per visitor.
 */
let active = 0;
const waiting: (() => void)[] = [];

async function withUploadSlot<T>(work: () => Promise<T>): Promise<T> {
  if (active >= IMAGE_UPLOAD_CONCURRENCY) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else {
    active++;
  }
  try {
    return await work();
  } finally {
    const next = waiting.shift();
    // Hand the slot straight to the next upload; otherwise free it.
    if (next) next();
    else active--;
  }
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // non-JSON body (e.g. a platform error page)
  }
  if (response.status === 413) return 'File too large to upload.';
  return fallback;
}

/**
 * POSTs a form to the image API. When the server says it's rate limited
 * or busy, waits the time it asks for and retries a couple of times.
 */
export function postImageForm(
  path: string,
  build: () => FormData,
  fallbackError = 'Processing failed',
): Promise<Blob> {
  return withUploadSlot(() => send(path, build, fallbackError));
}

async function send(path: string, build: () => FormData, fallbackError: string): Promise<Blob> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(path, { method: 'POST', body: build() });
    } catch {
      throw new ApiError('Network error — check your connection and try again.', 0);
    }

    if (response.ok) return response.blob();

    const retryable = response.status === 429 || response.status === 503;
    const retryAfter = Number(response.headers.get('Retry-After')) * 1000 || 3000;
    if (retryable && attempt < MAX_RETRIES && retryAfter <= MAX_RETRY_WAIT_MS) {
      await sleep(retryAfter + Math.random() * 500);
      continue;
    }
    throw new ApiError(
      await errorMessage(response, fallbackError),
      response.status,
      retryAfter / 1000,
    );
  }
}

/** True when the server wants us to back off for longer than is worth waiting. */
export function isQuotaError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError && error.status === 429 && error.retryAfter * 1000 > MAX_RETRY_WAIT_MS
  );
}

/**
 * Runs `task` over `items` with at most `limit` in flight. Calling `stop()`
 * leaves the remaining items unstarted; their indexes are returned.
 */
export async function runQueue<T>(
  items: T[],
  task: (item: T, index: number, stop: () => void) => Promise<void>,
  limit = IMAGE_UPLOAD_CONCURRENCY,
): Promise<number[]> {
  let cursor = 0;
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!stopped && cursor < items.length) {
      const index = cursor++;
      await task(items[index], index, stop);
    }
  });
  await Promise.all(workers);
  return Array.from({ length: items.length - cursor }, (_, offset) => cursor + offset);
}
