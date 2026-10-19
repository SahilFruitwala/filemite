import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

import { SITE_URL } from '@/lib/site';
import { securityHeaders } from '@/server/security-headers';

/** Permanent redirects from the old MicroPNG and microPDF URLs. */
const REDIRECTS: Record<string, string> = {
  '/resize': '/image/resize',
  '/crop': '/image/crop',
  '/scrub': '/image/scrub',
  '/palette': '/image/palette',
  '/favicon': '/image/favicon',
  '/compare': '/image/compress',
  '/image': '/image/compress',
  '/merge': '/pdf/merge',
  '/split': '/pdf/split',
  '/extract': '/pdf/extract',
  '/compress': '/pdf/compress',
  '/pdf': '/pdf/merge',
};

const SECURITY_HEADERS = securityHeaders(import.meta.env.PROD);

/** Hosts that used to serve the app; they permanently redirect to the canonical origin. */
const LEGACY_HOSTS = new Set(['micropng.sahilfruitwala.com']);

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
    if (LEGACY_HOSTS.has(url.hostname)) {
      return new Response(null, {
        status: 301,
        headers: { Location: `${SITE_URL}${url.pathname}${url.search}` },
      });
    }
    const target = REDIRECTS[url.pathname.replace(/\/$/, '') || '/'];
    if (target) {
      return new Response(null, {
        status: 301,
        headers: { Location: `${target}${url.search}` },
      });
    }

    const response = await handler.fetch(request);
    try {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        if (!response.headers.has(name)) response.headers.set(name, value);
      }
      return response;
    } catch {
      // Immutable headers (e.g. a proxied response) — return it untouched.
      return response;
    }
  },
});
