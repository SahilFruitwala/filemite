import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const ENV_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RATE_LIMIT_BURST',
  'RATE_LIMIT_PER_MINUTE',
  'RATE_LIMIT_PER_HOUR',
  'RATE_LIMIT_IP_CONCURRENCY',
  'IMAGE_JOB_CONCURRENCY',
  'IMAGE_JOB_QUEUE',
  'IMAGE_JOB_QUEUE_TIMEOUT_MS',
];

/** The guard keeps module-level state, so every test loads a fresh copy. */
async function loadGuard(env: Record<string, string> = {}) {
  vi.resetModules();
  Object.assign(process.env, env);
  return import('./guard');
}

function upload(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/image/compress', {
    method: 'POST',
    headers: { 'content-length': '1000', 'x-vercel-forwarded-for': '1.1.1.1', ...headers },
  });
}

const ok = async () => new Response('done');

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});
afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('clientIp', () => {
  test('prefers the Vercel header, then x-forwarded-for, then x-real-ip', async () => {
    const { clientIp } = await loadGuard();
    const request = (headers: Record<string, string>) => new Request('http://x', { headers });
    expect(
      clientIp(request({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' })),
    ).toBe('1.1.1.1');
    expect(clientIp(request({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1' }))).toBe('2.2.2.2');
    expect(clientIp(request({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3');
    expect(clientIp(request({}))).toBe('unknown');
  });
});

describe('guardImageRequest', () => {
  test('rejects a missing Content-Length with 411', async () => {
    const { guardImageRequest } = await loadGuard();
    const request = new Request('http://x', { method: 'POST' });
    const response = await guardImageRequest(request, {}, ok);
    expect(response.status).toBe(411);
  });

  test('rejects oversized bodies with 413 before running the handler', async () => {
    const { guardImageRequest } = await loadGuard();
    const handler = vi.fn(ok);
    const response = await guardImageRequest(upload({ 'content-length': String(50 * 1024 * 1024) }), {}, handler);
    expect(response.status).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });

  test('runs the handler and adds rate-limit headers', async () => {
    const { guardImageRequest } = await loadGuard();
    const response = await guardImageRequest(upload(), {}, ok);
    expect(response.status).toBe(200);
    expect(response.headers.get('RateLimit-Limit')).toBe('12');
    expect(response.headers.get('RateLimit-Remaining')).toBe('11');
  });

  test('429s once the burst is spent and sets Retry-After', async () => {
    const { guardImageRequest } = await loadGuard({ RATE_LIMIT_BURST: '2' });
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
    const limited = await guardImageRequest(upload(), {}, ok);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  test('limits are per client IP', async () => {
    const { guardImageRequest } = await loadGuard({ RATE_LIMIT_BURST: '1' });
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(429);
    const other = upload({ 'x-vercel-forwarded-for': '9.9.9.9' });
    expect((await guardImageRequest(other, {}, ok)).status).toBe(200);
  });

  test('enforces the hourly quota and honours request cost', async () => {
    const { guardImageRequest } = await loadGuard({ RATE_LIMIT_PER_HOUR: '5' });
    expect((await guardImageRequest(upload(), { cost: 3 }, ok)).status).toBe(200);
    const denied = await guardImageRequest(upload(), { cost: 3 }, ok);
    expect(denied.status).toBe(429);
    expect(await denied.json()).toMatchObject({ error: expect.stringContaining('Hourly limit') });
  });

  test('caps concurrent requests per IP and refunds the rejected one', async () => {
    const { guardImageRequest } = await loadGuard({
      RATE_LIMIT_IP_CONCURRENCY: '1',
      RATE_LIMIT_BURST: '2',
    });
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    const first = guardImageRequest(upload(), {}, async () => {
      await gate;
      return new Response('slow');
    });
    await Promise.resolve();

    const second = await guardImageRequest(upload(), {}, ok);
    expect(second.status).toBe(429);
    finish();
    expect((await first).status).toBe(200);

    // The rejected request was refunded, so a burst token is still available.
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
  });

  test('returns 503 with Retry-After when a queued request times out, and refunds quota', async () => {
    const { guardImageRequest } = await loadGuard({
      IMAGE_JOB_CONCURRENCY: '1',
      IMAGE_JOB_QUEUE: '1',
      IMAGE_JOB_QUEUE_TIMEOUT_MS: '30',
      RATE_LIMIT_IP_CONCURRENCY: '5',
      RATE_LIMIT_BURST: '2',
    });
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    const running = guardImageRequest(upload(), {}, async () => {
      await gate;
      return new Response('slow');
    });
    await Promise.resolve();

    const busy = await guardImageRequest(upload(), {}, ok);
    expect(busy.status).toBe(503);
    expect(busy.headers.get('Retry-After')).toBe('5');
    finish();
    await running;

    // The 503 was refunded: burst of 2, one used by `running`, so one remains.
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
  });

  test('returns 503 immediately when the wait queue is already full', async () => {
    const { guardImageRequest } = await loadGuard({
      IMAGE_JOB_CONCURRENCY: '1',
      IMAGE_JOB_QUEUE: '1',
      IMAGE_JOB_QUEUE_TIMEOUT_MS: '5000',
      RATE_LIMIT_IP_CONCURRENCY: '5',
      RATE_LIMIT_BURST: '5',
    });
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    const slow = async () => {
      await gate;
      return new Response('slow');
    };
    const running = guardImageRequest(upload(), {}, slow);
    const queued = guardImageRequest(upload(), {}, ok);
    await Promise.resolve();

    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(503);
    finish();
    expect((await running).status).toBe(200);
    expect((await queued).status).toBe(200);
  });

  test('releases its slot when the handler throws', async () => {
    const { guardImageRequest } = await loadGuard({
      IMAGE_JOB_CONCURRENCY: '1',
      IMAGE_JOB_QUEUE: '0',
    });
    await expect(
      guardImageRequest(upload(), {}, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
  });

  test('falls back to defaults for invalid environment values', async () => {
    const { guardImageRequest } = await loadGuard({ RATE_LIMIT_BURST: 'abc' });
    const response = await guardImageRequest(upload(), {}, ok);
    expect(response.headers.get('RateLimit-Limit')).toBe('12');
  });
});

describe('shared hourly quota (Redis configured)', () => {
  const redisEnv = { UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 't' };

  /** Redis reply for the next INCRBY: the visitor's running total across all instances. */
  function mockRedis(total: () => number) {
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const commands = JSON.parse(String(init?.body)) as string[][];
        sent.push(commands[0][0]);
        return new Response(JSON.stringify(commands.map(() => ({ result: total() }))));
      }),
    );
    return sent;
  }

  afterEach(() => vi.unstubAllGlobals());

  test('rejects with 429 when other instances already used the quota', async () => {
    mockRedis(() => 999);
    const { guardImageRequest } = await loadGuard({ ...redisEnv, RATE_LIMIT_PER_HOUR: '100' });
    const handler = vi.fn(ok);
    const response = await guardImageRequest(upload(), {}, handler);
    expect(response.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  test('gives the shared quota back for a rejected attempt', async () => {
    const sent = mockRedis(() => 999);
    const { guardImageRequest } = await loadGuard(redisEnv);
    await guardImageRequest(upload(), {}, ok);
    await Promise.resolve();
    expect(sent).toContain('INCRBY');
    expect(sent).toContain('DECRBY');
  });

  test('processes the request when the shared count is within the limit', async () => {
    mockRedis(() => 1);
    const { guardImageRequest } = await loadGuard(redisEnv);
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
  });

  test('still serves requests when Redis is down', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const { guardImageRequest } = await loadGuard(redisEnv);
    expect((await guardImageRequest(upload(), {}, ok)).status).toBe(200);
  });
});

describe('analyticsRateLimit', () => {
  test('allows traffic until the bucket is empty', async () => {
    const { analyticsRateLimit } = await loadGuard();
    const request = () => new Request('http://x', { headers: { 'x-forwarded-for': '4.4.4.4' } });
    for (let i = 0; i < 120; i++) expect(analyticsRateLimit(request())).toBeNull();
    expect(analyticsRateLimit(request())?.status).toBe(429);
  });
});
