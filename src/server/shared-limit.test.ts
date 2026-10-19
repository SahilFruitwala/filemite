import { describe, expect, test, vi } from 'vitest';
import { createRedisLimiter, sharedLimiterFromEnv } from './shared-limit';

/** In-memory stand-in for Upstash's /pipeline endpoint that understands the commands we send. */
function fakeRedis() {
  const counts = new Map<string, number>();
  const calls: unknown[][][] = [];
  const handler = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const commands = JSON.parse(String(init?.body)) as (string | number)[][];
    calls.push(commands);
    const results = commands.map(([name, key, amount]) => {
      const current = counts.get(String(key)) ?? 0;
      if (name === 'INCRBY') counts.set(String(key), current + Number(amount));
      if (name === 'DECRBY') counts.set(String(key), current - Number(amount));
      return { result: counts.get(String(key)) ?? 0 };
    });
    return new Response(JSON.stringify(results), { status: 200 });
  });
  return { handler: handler as unknown as typeof fetch, counts, calls, mock: handler };
}

const limiter = (redis: ReturnType<typeof fakeRedis>, now = () => 0) =>
  createRedisLimiter({ url: 'https://redis.example/', token: 'secret', fetch: redis.handler, now });

describe('createRedisLimiter', () => {
  test('allows requests up to the limit, then rejects with the time left in the window', async () => {
    const redis = fakeRedis();
    const shared = limiter(redis, () => 1000 * 600); // ten minutes into the first window
    expect(await shared.take('1.1.1.1', 3, 5)).toEqual({ ok: true, retryAfter: 0 });
    expect(await shared.take('1.1.1.1', 2, 5)).toEqual({ ok: true, retryAfter: 0 });
    expect(await shared.take('1.1.1.1', 1, 5)).toEqual({ ok: false, retryAfter: 3000 });
  });

  test('counts each visitor separately', async () => {
    const redis = fakeRedis();
    const shared = limiter(redis);
    await shared.take('a', 5, 5);
    expect((await shared.take('b', 5, 5)).ok).toBe(true);
    expect((await shared.take('a', 1, 5)).ok).toBe(false);
  });

  test('starts a fresh count in the next hour', async () => {
    const redis = fakeRedis();
    let now = 0;
    const shared = limiter(redis, () => now);
    await shared.take('a', 5, 5);
    expect((await shared.take('a', 1, 5)).ok).toBe(false);
    now = 3600 * 1000;
    expect((await shared.take('a', 1, 5)).ok).toBe(true);
  });

  test('refund gives quota back', async () => {
    const redis = fakeRedis();
    const shared = limiter(redis);
    await shared.take('a', 5, 5);
    await shared.refund('a', 3);
    expect((await shared.take('a', 3, 5)).ok).toBe(true);
  });

  test('sends the token, and sets an expiry only if none exists', async () => {
    const redis = fakeRedis();
    await limiter(redis).take('a', 1, 5);
    const [url, init] = redis.mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://redis.example/pipeline');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
    expect(redis.calls[0][1]).toEqual(['EXPIRE', expect.stringContaining('filemite:quota:a:'), 3660, 'NX']);
  });

  describe('fails open', () => {
    test.each([
      ['a network error', () => Promise.reject(new Error('offline'))],
      ['an HTTP error', () => Promise.resolve(new Response('nope', { status: 500 }))],
      ['a Redis error reply', () => Promise.resolve(new Response(JSON.stringify([{ error: 'ERR' }, {}])))],
      ['a malformed reply', () => Promise.resolve(new Response('not json'))],
    ])('on %s', async (_label, reply) => {
      const shared = createRedisLimiter({
        url: 'https://redis.example',
        token: 't',
        fetch: (() => reply()) as unknown as typeof fetch,
      });
      expect(await shared.take('a', 1, 5)).toEqual({ ok: true, retryAfter: 0 });
      await expect(shared.refund('a', 1)).resolves.toBeUndefined();
    });
  });
});

describe('sharedLimiterFromEnv', () => {
  test('is off unless both a URL and a token are set', () => {
    expect(sharedLimiterFromEnv({})).toBeNull();
    expect(sharedLimiterFromEnv({ UPSTASH_REDIS_REST_URL: 'https://x' })).toBeNull();
    expect(sharedLimiterFromEnv({ UPSTASH_REDIS_REST_TOKEN: 't' })).toBeNull();
  });

  test('accepts Upstash and Vercel KV variable names', () => {
    expect(sharedLimiterFromEnv({ UPSTASH_REDIS_REST_URL: 'https://x', UPSTASH_REDIS_REST_TOKEN: 't' })).not.toBeNull();
    expect(sharedLimiterFromEnv({ KV_REST_API_URL: 'https://x', KV_REST_API_TOKEN: 't' })).not.toBeNull();
  });
});
