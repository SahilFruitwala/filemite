import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

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

const COMPRESSIBLE = /^(text\/(html|plain|markdown)|application\/(json|xml|ld\+json))/;

/**
 * Compresses server-rendered documents. Static assets are pre-compressed at build
 * time (`compressPublicAssets` in vite.config.ts); this covers the HTML and API
 * responses that Nitro's Node server would otherwise send uncompressed.
 */
async function compressResponse(response: Response, request: Request): Promise<Response> {
  if (request.method === 'HEAD' || response.body === null) return response;
  if (response.headers.has('content-encoding')) return response;
  if (!COMPRESSIBLE.test(response.headers.get('content-type') ?? '')) return response;

  const accept = request.headers.get('accept-encoding') ?? '';
  const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
  if (!encoding) return response;

  const body = Buffer.from(await response.arrayBuffer());
  if (body.length < 1024) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-encoding', encoding);
  headers.append('Vary', 'Accept-Encoding');
  const compressed =
    encoding === 'br'
      ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
      : gzipSync(body, { level: 6 });

  return new Response(compressed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
    response = await compressResponse(response, request);
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
