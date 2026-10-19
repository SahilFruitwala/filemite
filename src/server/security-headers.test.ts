import { describe, expect, test } from 'vitest';
import { CONTENT_SECURITY_POLICY, securityHeaders } from './security-headers';

const directive = (name: string) =>
  CONTENT_SECURITY_POLICY.split('; ')
    .find((part) => part.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(' ');

describe('Content-Security-Policy', () => {
  test('locks everything to the site by default', () => {
    expect(directive('default-src')).toEqual(["'self'"]);
    expect(directive('connect-src')).toEqual(["'self'"]);
  });

  test('forbids plugins, foreign bases and foreign form targets', () => {
    expect(directive('object-src')).toEqual(["'none'"]);
    expect(directive('base-uri')).toEqual(["'self'"]);
    expect(directive('form-action')).toEqual(["'self'"]);
  });

  test('never allows eval or any remote script origin', () => {
    const scripts = directive('script-src') ?? [];
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts.filter((source) => /^https?:|\*/.test(source))).toEqual([]);
  });

  test('allows what the PDF engine and previews need', () => {
    expect(directive('script-src')).toContain("'wasm-unsafe-eval'");
    expect(directive('worker-src')).toEqual(expect.arrayContaining(["'self'", 'blob:']));
    expect(directive('img-src')).toEqual(expect.arrayContaining(['blob:', 'data:']));
  });

  test('is only sent in production', () => {
    expect(securityHeaders(true)['Content-Security-Policy']).toBe(CONTENT_SECURITY_POLICY);
    expect(securityHeaders(false)['Content-Security-Policy']).toBeUndefined();
    expect(securityHeaders(false)['X-Content-Type-Options']).toBe('nosniff');
  });
});
