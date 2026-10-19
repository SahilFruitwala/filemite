import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/** Longest a response waits for analytics when the platform can't finish the send afterwards. */
export const FLUSH_TIMEOUT_MS = 1000;

function getPostHogClient(): PostHog | null {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!key) return null;
  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    });
  }
  return posthogClient;
}

type WaitUntil = (promise: Promise<unknown>) => void;

/**
 * Server-side event capture. Serverless functions can be frozen as soon as the
 * response is sent, so a queued event may never leave — the event is sent
 * immediately instead, and finished after the response when the platform
 * exposes `request.waitUntil` (Vercel does). Without it the response waits for
 * the send, but never longer than FLUSH_TIMEOUT_MS. Analytics failures never
 * reach the caller.
 */
export async function captureServerEvent(
  event: string,
  properties: Record<string, unknown>,
  request?: Request,
): Promise<void> {
  try {
    const client = getPostHogClient();
    if (!client) return;

    const send = client
      .captureImmediate({ distinctId: 'server', event, properties })
      .catch(() => {});

    const waitUntil = (request as (Request & { waitUntil?: WaitUntil }) | undefined)?.waitUntil;
    if (typeof waitUntil === 'function') {
      waitUntil.call(request, send);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, FLUSH_TIMEOUT_MS);
    });
    await Promise.race([send, timeout]);
    clearTimeout(timer);
  } catch {
    // ignore analytics errors
  }
}
