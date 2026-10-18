import { createFileRoute } from '@tanstack/react-router';
import { analyticsRateLimit } from '@/server/guard';

const POSTHOG_HOST = 'https://us.i.posthog.com';
const POSTHOG_ASSETS = 'https://us-assets.i.posthog.com';

/** Reverse proxy for PostHog so analytics traffic is first-party. */
async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const limited = analyticsRateLimit(request);
  if (limited) return limited;

  const path = params._splat ?? '';
  const search = new URL(request.url).search;
  const target = path.startsWith('static/')
    ? `${POSTHOG_ASSETS}/${path}${search}`
    : `${POSTHOG_HOST}/${path}${search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');

  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    // @ts-expect-error - duplex is required for streaming bodies but missing from types
    duplex: 'half',
  });
}

export const Route = createFileRoute('/ingest/$')({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      OPTIONS: proxy,
    },
  },
});
