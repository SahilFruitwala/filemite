import { describe, expect, test } from 'bun:test';
import { BusyError, InFlight, Semaphore, TokenBucket } from './rate-limit';

describe('TokenBucket', () => {
  test('allows a burst, then refills over time', () => {
    let now = 0;
    const bucket = new TokenBucket({ capacity: 3, refillPerSecond: 1, now: () => now });
    expect(bucket.take('a').ok).toBe(true);
    expect(bucket.take('a').ok).toBe(true);
    expect(bucket.take('a').ok).toBe(true);
    const denied = bucket.take('a');
    expect(denied.ok).toBe(false);
    expect(denied.retryAfter).toBe(1);

    now = 1500;
    expect(bucket.take('a').ok).toBe(true);
    expect(bucket.take('a').ok).toBe(false);
  });

  test('tracks clients separately and honours cost', () => {
    const bucket = new TokenBucket({ capacity: 4, refillPerSecond: 1, now: () => 0 });
    expect(bucket.take('a', 3).ok).toBe(true);
    expect(bucket.take('a', 3).ok).toBe(false);
    expect(bucket.take('b', 3).ok).toBe(true);
  });

  test('evicts the least recently seen clients beyond maxKeys', () => {
    const bucket = new TokenBucket({
      capacity: 1,
      refillPerSecond: 0.001,
      maxKeys: 2,
      now: () => 0,
    });
    bucket.take('a');
    bucket.take('b');
    bucket.take('c'); // evicts "a"
    expect(bucket.take('a').ok).toBe(true); // fresh bucket again
    expect(bucket.take('c').ok).toBe(false);
  });
});

describe('Semaphore', () => {
  test('runs up to maxActive and queues the rest in order', async () => {
    const semaphore = new Semaphore(1, 2);
    const first = await semaphore.acquire({ timeoutMs: 1000 });
    const order: string[] = [];
    const second = semaphore.acquire({ timeoutMs: 1000 }).then((release) => {
      order.push('second');
      return release;
    });
    expect(semaphore.waiting).toBe(1);
    first();
    (await second)();
    expect(order).toEqual(['second']);
    expect(semaphore.running).toBe(0);
  });

  test('rejects when the queue is full', async () => {
    const semaphore = new Semaphore(1, 0);
    await semaphore.acquire({ timeoutMs: 1000 });
    await expect(semaphore.acquire({ timeoutMs: 1000 })).rejects.toBeInstanceOf(BusyError);
  });

  test('times out and aborts queued waiters', async () => {
    const semaphore = new Semaphore(1, 5);
    const hold = await semaphore.acquire({ timeoutMs: 1000 });
    await expect(semaphore.acquire({ timeoutMs: 10 })).rejects.toMatchObject({ reason: 'timeout' });

    const controller = new AbortController();
    const pending = semaphore.acquire({ timeoutMs: 1000, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ reason: 'aborted' });
    expect(semaphore.waiting).toBe(0);

    hold();
    expect(semaphore.running).toBe(0);
  });

  test('release is idempotent', async () => {
    const semaphore = new Semaphore(2, 0);
    const release = await semaphore.acquire({ timeoutMs: 1000 });
    release();
    release();
    expect(semaphore.running).toBe(0);
  });
});

describe('InFlight', () => {
  test('caps concurrent entries per key', () => {
    const inFlight = new InFlight();
    expect(inFlight.tryEnter('a', 2)).toBe(true);
    expect(inFlight.tryEnter('a', 2)).toBe(true);
    expect(inFlight.tryEnter('a', 2)).toBe(false);
    inFlight.leave('a');
    expect(inFlight.tryEnter('a', 2)).toBe(true);
  });
});

describe('TokenBucket.refund', () => {
  test('returns tokens without exceeding capacity', () => {
    const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 0.001, now: () => 0 });
    bucket.take('a', 2);
    expect(bucket.take('a').ok).toBe(false);
    bucket.refund('a', 1);
    expect(bucket.take('a').ok).toBe(true);
    bucket.refund('a', 10);
    expect(bucket.take('a', 3).ok).toBe(false);
  });
});
