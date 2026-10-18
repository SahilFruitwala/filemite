import { IMAGE_UPLOAD_CONCURRENCY } from '@/lib/limits';

/** Longest we'll wait on a Retry-After before giving up and showing the error. */
const MAX_RETRY_WAIT_MS = 15_000;
const MAX_RETRIES = 2;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
export async function postImageForm(
  path: string,
  build: () => FormData,
  fallbackError = 'Processing failed',
): Promise<Blob> {
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
    throw new ApiError(await errorMessage(response, fallbackError), response.status);
  }
}

/** Runs `task` over `items` with at most `limit` in flight. */
export async function runQueue<T>(
  items: T[],
  task: (item: T, index: number) => Promise<void>,
  limit = IMAGE_UPLOAD_CONCURRENCY,
) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await task(items[index], index);
    }
  });
  await Promise.all(workers);
}
