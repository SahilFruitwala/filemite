import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

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

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
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
