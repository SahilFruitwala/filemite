import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!key) return null;
  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

/** Fire-and-forget server-side event capture; analytics failures never break a response. */
export function captureServerEvent(event: string, properties: Record<string, unknown>): void {
  try {
    getPostHogClient()?.capture({ distinctId: 'server', event, properties });
  } catch {
    // ignore analytics errors
  }
}
