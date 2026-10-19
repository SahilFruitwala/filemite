/**
 * Response headers added to every page. The CSP is tuned to what the app really
 * loads: same-origin assets and PostHog proxy, blob: previews, and MuPDF's WebAssembly
 * in a Web Worker. Inline scripts are allowed because TanStack Start's hydration and the
 * theme bootstrap are inline; everything else is locked to the site's own origin.
 */

const DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  // 'wasm-unsafe-eval' only matters where MuPDF's worker script is served with this policy
  // (static assets currently aren't); it is kept so that setup can't silently break the PDF tools.
  'script-src': ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  // blob: and data: cover page thumbnails, result previews and canvas exports.
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  // Uploads, the PostHog proxy and the WASM binary are all same-origin.
  'connect-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'media-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
};

export const CONTENT_SECURITY_POLICY = Object.entries(DIRECTIVES)
  .map(([name, sources]) => `${name} ${sources.join(' ')}`)
  .join('; ');

const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * The CSP is production-only: the dev server's hot reload needs eval and a
 * websocket, which this policy deliberately forbids.
 */
export function securityHeaders(production: boolean): Record<string, string> {
  return production
    ? { ...BASE_HEADERS, 'Content-Security-Policy': CONTENT_SECURITY_POLICY }
    : BASE_HEADERS;
}
