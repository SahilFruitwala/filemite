import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const captureImmediate = vi.fn();
vi.mock('posthog-node', () => ({
  PostHog: class {
    captureImmediate = captureImmediate;
  },
}));

async function load(token: string | undefined) {
  vi.resetModules();
  vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', token ?? '');
  return import('./posthog');
}

beforeEach(() => {
  captureImmediate.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('captureServerEvent', () => {
  test('does nothing without a project token', async () => {
    const { captureServerEvent } = await load(undefined);
    await captureServerEvent('e', {});
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  test('sends the event immediately and waits for it when the platform has no waitUntil', async () => {
    let sent = false;
    captureImmediate.mockImplementation(async () => {
      await Promise.resolve();
      sent = true;
    });
    const { captureServerEvent } = await load('key');
    await captureServerEvent('image_done', { size: 1 });
    expect(captureImmediate).toHaveBeenCalledWith({
      distinctId: 'server',
      event: 'image_done',
      properties: { size: 1 },
    });
    expect(sent).toBe(true);
  });

  test('hands the send to waitUntil and returns without waiting', async () => {
    let finish!: () => void;
    captureImmediate.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const waitUntil = vi.fn();
    const request = Object.assign(new Request('http://x'), { waitUntil });
    const { captureServerEvent } = await load('key');
    await captureServerEvent('e', {}, request);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);
    finish();
  });

  test('stops waiting after the timeout when the send hangs', async () => {
    captureImmediate.mockReturnValue(new Promise(() => {}));
    const { captureServerEvent, FLUSH_TIMEOUT_MS } = await load('key');
    vi.useFakeTimers();
    const done = captureServerEvent('e', {});
    await vi.advanceTimersByTimeAsync(FLUSH_TIMEOUT_MS);
    await expect(done).resolves.toBeUndefined();
  });

  test('swallows send failures and client errors', async () => {
    captureImmediate.mockRejectedValue(new Error('network down'));
    const { captureServerEvent } = await load('key');
    await expect(captureServerEvent('e', {})).resolves.toBeUndefined();

    captureImmediate.mockImplementation(() => {
      throw new Error('sync boom');
    });
    await expect(captureServerEvent('e', {})).resolves.toBeUndefined();
  });
});
