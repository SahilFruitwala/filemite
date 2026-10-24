import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

import { SITE_URL } from '@/lib/site';
import { markdownResponse, notFoundMarkdown, pageMarkdown, wantsMarkdown } from '@/server/markdown';
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

    const headOnly = request.method === 'HEAD';
    const markdown = (headOnly || request.method === 'GET') && wantsMarkdown(request.headers.get('accept'));
    const page = markdown ? pageMarkdown(url.pathname) : null;

    let response = page === null ? await handler.fetch(request) : markdownResponse(page, 200, headOnly);
    // The page renderer answers 406 JSON to a non-HTML Accept on a path it has no page for.
    // Agents asking for Markdown get a Markdown 404 there instead; /api, /ingest and files keep their own.
    const pageLike = !/^\/(api|ingest)(\/|$)/.test(url.pathname) && !/\.\w+$/.test(url.pathname);
    if (markdown && pageLike && (response.status === 404 || response.status === 406)) {
      response = markdownResponse(notFoundMarkdown(url.pathname), 404, headOnly);
    }
    try {
      // Pages differ by Accept (HTML vs Markdown), so caches must key on it.
      if (response.headers.get('content-type')?.includes('text/html')) response.headers.append('Vary', 'Accept');
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        if (!response.headers.has(name)) response.headers.set(name, value);
      }
      // The 404 page shares the root layout's `index, follow` meta, so keep it out of the index by header.
      if (response.status === 404) response.headers.set('X-Robots-Tag', 'noindex');
      return response;
    } catch {
      // Immutable headers (e.g. a proxied response) — return it untouched.
      return response;
    }
  },
});
