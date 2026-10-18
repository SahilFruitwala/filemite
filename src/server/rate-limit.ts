/**
 * In-memory abuse protection for the image API.
 *
 * - `TokenBucket` caps how many requests an IP can make over time.
 * - `Semaphore` caps how many Sharp jobs run at once on this instance and
 *   queues a bounded number of extra requests instead of piling them on.
 *
 * State lives in the server process, so on serverless platforms each warm
 * instance enforces its own limits. That still stops a single client from
 * monopolising an instance; put a shared limiter (e.g. Vercel WAF or Redis)
 * in front if you need a global cap.
 */

export type TakeResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until enough tokens are available again (0 when `ok`). */
  retryAfter: number;
};

type Bucket = { tokens: number; updatedAt: number };

export class TokenBucket {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly options: {
      /** Burst size: tokens a fresh client starts with. */
      capacity: number;
      /** Tokens regained per second. */
      refillPerSecond: number;
      /** Tracked clients; the least recently seen are dropped beyond this. */
      maxKeys?: number;
      now?: () => number;
    },
  ) {}

  take(key: string, cost = 1): TakeResult {
    const { capacity, refillPerSecond, maxKeys = 10_000 } = this.options;
    const now = (this.options.now ?? Date.now)();

    const existing = this.buckets.get(key);
    const bucket = existing ?? { tokens: capacity, updatedAt: now };
    const elapsed = Math.max(0, now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
    bucket.updatedAt = now;

    // Re-insert so Map order tracks recency, then evict the stalest clients.
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    while (this.buckets.size > maxKeys) {
      const oldest = this.buckets.keys().next().value;
      if (oldest === undefined) break;
      this.buckets.delete(oldest);
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { ok: true, limit: capacity, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
    }
    return {
      ok: false,
      limit: capacity,
      remaining: Math.floor(bucket.tokens),
      retryAfter: Math.max(1, Math.ceil((cost - bucket.tokens) / refillPerSecond)),
    };
  }
}

export class BusyError extends Error {
  constructor(readonly reason: 'queue-full' | 'timeout' | 'aborted') {
    super(`Server busy (${reason})`);
    this.name = 'BusyError';
  }
}

type Waiter = { grant: () => void; reject: (error: BusyError) => void };

export class Semaphore {
  private active = 0;
  private queue: Waiter[] = [];

  constructor(
    private readonly maxActive: number,
    private readonly maxQueued: number,
  ) {}

  get running() {
    return this.active;
  }

  get waiting() {
    return this.queue.length;
  }

  /** Resolves with a release function once a slot is free. */
  acquire({ timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal }): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new BusyError('aborted'));

    if (this.active < this.maxActive) {
      this.active++;
      return Promise.resolve(this.releaser());
    }
    if (this.queue.length >= this.maxQueued) {
      return Promise.reject(new BusyError('queue-full'));
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };
      const drop = (reason: BusyError['reason']) => {
        const index = this.queue.indexOf(waiter);
        if (index !== -1) this.queue.splice(index, 1);
        cleanup();
        reject(new BusyError(reason));
      };
      const onAbort = () => drop('aborted');
      const timer = setTimeout(() => drop('timeout'), timeoutMs);
      const waiter: Waiter = {
        grant: () => {
          cleanup();
          resolve(this.releaser());
        },
        reject,
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.queue.push(waiter);
    });
  }

  private releaser() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.queue.shift();
      // Hand the slot straight to the next waiter; `active` stays the same.
      if (next) next.grant();
      else this.active--;
    };
  }
}

/** Counts requests in flight per key. */
export class InFlight {
  private counts = new Map<string, number>();

  tryEnter(key: string, max: number): boolean {
    const current = this.counts.get(key) ?? 0;
    if (current >= max) return false;
    this.counts.set(key, current + 1);
    return true;
  }

  leave(key: string) {
    const current = this.counts.get(key) ?? 0;
    if (current <= 1) this.counts.delete(key);
    else this.counts.set(key, current - 1);
  }
}
