import { sanitizeEvent } from '@/lib/analytics';

type Client = typeof import('posthog-js').default;

type QueuedEvent = { event: string; properties?: Record<string, unknown> };

/**
 * PostHog is loaded lazily, after the page is interactive, so the analytics SDK
 * never sits on the critical path. Events fired before it finishes loading are
 * queued and flushed once the client is ready.
 */
let client: Client | null = null;
let loading: Promise<Client | null> | null = null;
let queue: QueuedEvent[] = [];

function load(): Promise<Client | null> {
  if (loading) return loading;
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!key || typeof window === 'undefined') {
    loading = Promise.resolve(null);
    return loading;
  }
  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: '/ingest',
          ui_host: 'https://us.posthog.com',
          defaults: '2026-01-30',
          // Only the explicit events (counts, sizes, settings) are sent. Autocapture
          // and recordings could pick up file names shown on the page.
          autocapture: false,
          disable_session_recording: true,
          mask_all_text: true,
          mask_all_element_attributes: true,
          person_profiles: 'identified_only',
          // Cookieless: the anonymous ID lives in memory only, so nothing is written to
          // cookies or localStorage and no consent banner is needed. See /privacy.
          persistence: 'memory',
          capture_heatmaps: false,
          capture_dead_clicks: false,
          capture_performance: false,
          // Error reports carry the failing function and a generic message only.
          capture_exceptions: true,
          before_send: sanitizeEvent,
          debug: import.meta.env.DEV,
        });
      }
      client = posthog;
      const pending = queue;
      queue = [];
      for (const { event, properties } of pending) posthog.capture(event, properties);
      return posthog;
    })
    .catch(() => null);
  return loading;
}

/** Starts loading PostHog once the browser is idle, off the critical path. */
export function initAnalytics() {
  if (typeof window === 'undefined') return;
  const start = () => void load();
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 3000 });
  } else {
    window.setTimeout(start, 2000);
  }
}

/** Sends an event; queues it if PostHog is still loading, no-ops if unconfigured. */
export function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (client) {
    client.capture(event, properties);
    return;
  }
  // Nothing to load and nothing to send to: drop the event.
  if (!import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  queue.push({ event, properties });
  void load();
}
