/**
 * Request guard for the image API: size check, per-IP rate limit, per-IP
 * concurrency cap and a global job queue, applied before the body is read.
 */
import { availableParallelism } from 'node:os';
import {
  IMAGE_UPLOAD_CONCURRENCY,
  IMAGES_PER_HOUR,
  MAX_IMAGE_BATCH,
  MAX_IMAGE_BYTES,
} from '@/lib/limits';
import { BusyError, InFlight, Semaphore, TokenBucket } from './rate-limit';

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Tunable through environment variables; defaults suit a small instance. */
const config = {
  /** Requests an IP can burst: one full batch plus a couple of retries. */
  burst: envNumber('RATE_LIMIT_BURST', MAX_IMAGE_BATCH + 2),
  /** Sustained requests per IP per minute. */
  perMinute: envNumber('RATE_LIMIT_PER_MINUTE', 12),
  /** Requests per IP per hour, across all image tools. */
  perHour: envNumber('RATE_LIMIT_PER_HOUR', IMAGES_PER_HOUR),
  /** Requests one IP may have in flight (running or queued) at once. */
  perIpConcurrency: envNumber('RATE_LIMIT_IP_CONCURRENCY', IMAGE_UPLOAD_CONCURRENCY),
  /** Image jobs processed at once by this instance — one per core, 2 to 4. */
  concurrency: envNumber('IMAGE_JOB_CONCURRENCY', Math.max(2, Math.min(4, availableParallelism()))),
  /** Extra requests allowed to wait for a slot (each IP can hold at most a couple). */
  queueSize: envNumber('IMAGE_JOB_QUEUE', 16),
  /** How long a queued request waits before giving up. */
  queueTimeoutMs: envNumber('IMAGE_JOB_QUEUE_TIMEOUT_MS', 20_000),
};

const buckets = new TokenBucket({
  capacity: config.burst,
  refillPerSecond: config.perMinute / 60,
});
const hourly = new TokenBucket({
  capacity: config.perHour,
  refillPerSecond: config.perHour / 3600,
});
const inFlight = new InFlight();
const jobs = new Semaphore(config.concurrency, config.queueSize);

/** Multipart overhead on top of the file itself. */
const FORM_OVERHEAD_BYTES = 64 * 1024;

export function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

/**
 * Best-effort client address. Vercel and most proxies overwrite
 * `x-forwarded-for`; when running without one, the socket address is used.
 */
export function clientIp(request: Request): string {
  const forwarded =
    request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first;
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const socketIp = (request as Request & { ip?: string }).ip;
  return socketIp || 'unknown';
}

type GuardOptions = {
  /** Rate-limit tokens this request costs (heavier endpoints cost more). */
  cost?: number;
  /** Largest accepted request body. */
  maxBytes?: number;
};

export async function guardImageRequest(
  request: Request,
  { cost = 1, maxBytes = MAX_IMAGE_BYTES + FORM_OVERHEAD_BYTES }: GuardOptions,
  handler: () => Promise<Response>,
): Promise<Response> {
  // Reject oversized uploads from the header alone, before buffering anything.
  const lengthHeader = request.headers.get('content-length');
  const length = lengthHeader === null ? NaN : Number(lengthHeader);
  if (!Number.isFinite(length)) {
    return jsonError('Missing Content-Length header.', 411);
  }
  if (length > maxBytes) {
    return jsonError(
      `File too large. Max size is ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
      413,
    );
  }

  const ip = clientIp(request);
  const hour = hourly.take(ip, cost);
  if (!hour.ok) {
    const minutes = Math.ceil(hour.retryAfter / 60);
    return jsonError(
      `Hourly limit reached (${hour.limit} images). Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      429,
      { 'Retry-After': String(hour.retryAfter) },
    );
  }

  const rate = buckets.take(ip, cost);
  const rateHeaders = {
    'RateLimit-Limit': String(rate.limit),
    'RateLimit-Remaining': String(Math.max(0, rate.remaining)),
  };
  if (!rate.ok) {
    hourly.refund(ip, cost);
    return jsonError(`Too many requests. Try again in ${rate.retryAfter}s.`, 429, {
      ...rateHeaders,
      'Retry-After': String(rate.retryAfter),
    });
  }

  if (!inFlight.tryEnter(ip, config.perIpConcurrency)) {
    // Not processed, so it shouldn't count against the visitor's quotas.
    buckets.refund(ip, cost);
    hourly.refund(ip, cost);
    return jsonError('Too many uploads at once. Wait for the current ones to finish.', 429, {
      ...rateHeaders,
      'Retry-After': '2',
    });
  }

  let release: (() => void) | null = null;
  try {
    try {
      release = await jobs.acquire({ timeoutMs: config.queueTimeoutMs, signal: request.signal });
    } catch (error) {
      if (error instanceof BusyError) {
        buckets.refund(ip, cost);
        hourly.refund(ip, cost);
        return jsonError('The server is busy right now. Please try again in a moment.', 503, {
          ...rateHeaders,
          'Retry-After': '5',
        });
      }
      throw error;
    }

    const response = await handler();
    for (const [name, value] of Object.entries(rateHeaders)) {
      response.headers.set(name, value);
    }
    return response;
  } finally {
    release?.();
    inFlight.leave(ip);
  }
}

/** Lightweight limiter for the analytics proxy: no queue, just a rate cap. */
const analyticsBuckets = new TokenBucket({ capacity: 120, refillPerSecond: 2 });

export function analyticsRateLimit(request: Request): Response | null {
  const rate = analyticsBuckets.take(clientIp(request));
  return rate.ok
    ? null
    : jsonError('Too many requests.', 429, { 'Retry-After': String(rate.retryAfter) });
}
