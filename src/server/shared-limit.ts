/**
 * Optional hourly quota shared by every server instance, backed by Redis over
 * Upstash's REST API (plain fetch, no client library). Without it each warm
 * serverless instance counts on its own, so a visitor can exceed the quota by
 * landing on several instances.
 *
 * It fails open: if Redis is unreachable or slow, requests are allowed and the
 * per-instance limits still apply, so an outage can't take image tools down.
 */

export type SharedTake = { ok: boolean; retryAfter: number };

export type SharedLimiter = {
  /** Counts `cost` against `key`'s current window and reports whether it fits within `limit`. */
  take(key: string, cost: number, limit: number): Promise<SharedTake>;
  /** Gives back `cost` after a request that was rejected later on. Best effort. */
  refund(key: string, cost: number): Promise<void>;
};

const WINDOW_SECONDS = 3600;
const REQUEST_TIMEOUT_MS = 500;

type Options = {
  url: string;
  token: string;
  fetch?: typeof fetch;
  now?: () => number;
};

export function createRedisLimiter({
  url,
  token,
  fetch: fetchImpl = fetch,
  now = Date.now,
}: Options): SharedLimiter {
  const endpoint = `${url.replace(/\/$/, '')}/pipeline`;

  const run = async (commands: (string | number)[][]) => {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Redis responded ${response.status}`);
    return (await response.json()) as { result?: unknown; error?: string }[];
  };

  /** Fixed windows aligned to the clock, so every instance agrees on the key without coordination. */
  const windowOf = () => Math.floor(now() / 1000 / WINDOW_SECONDS);
  const keyFor = (key: string) => `filemite:quota:${key}:${windowOf()}`;

  return {
    async take(key, cost, limit) {
      try {
        const redisKey = keyFor(key);
        const [count] = await run([
          ['INCRBY', redisKey, cost],
          // Expire a little after the window ends; NX leaves an existing expiry alone.
          ['EXPIRE', redisKey, WINDOW_SECONDS + 60, 'NX'],
        ]);
        if (count?.error || typeof count?.result !== 'number') return { ok: true, retryAfter: 0 };
        if (count.result <= limit) return { ok: true, retryAfter: 0 };
        const windowEnd = (windowOf() + 1) * WINDOW_SECONDS;
        return { ok: false, retryAfter: Math.max(1, Math.ceil(windowEnd - now() / 1000)) };
      } catch {
        return { ok: true, retryAfter: 0 };
      }
    },

    async refund(key, cost) {
      try {
        await run([['DECRBY', keyFor(key), cost]]);
      } catch {
        // The window resets within the hour anyway.
      }
    },
  };
}

/** Builds the limiter from the environment, or null when Redis isn't configured. */
export function sharedLimiterFromEnv(env: NodeJS.ProcessEnv = process.env): SharedLimiter | null {
  // UPSTASH_* is what Upstash documents; KV_REST_* is what Vercel's marketplace integration sets.
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? createRedisLimiter({ url, token }) : null;
}
