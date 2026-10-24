import { describe, expect, test } from 'vitest';

import { SITE_URL } from '@/lib/site';
import { tools } from '@/lib/tools';
import { markdownResponse, notFoundMarkdown, pageMarkdown, wantsMarkdown } from './markdown';

describe('wantsMarkdown', () => {
  test.each([
    ['text/markdown', true],
    ['text/markdown, text/html;q=0.8', true],
    ['text/html;q=0.5, text/markdown', true],
    ['text/markdown;q=0.4, text/html;q=0.9', false],
    ['text/markdown;q=0', false],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
    ['*/*', false],
    ['text/html, text/markdown', false],
    ['TEXT/MARKDOWN', true],
  ])('%s -> %s', (accept, expected) => expect(wantsMarkdown(accept)).toBe(expected));

  test('no Accept header means HTML', () => expect(wantsMarkdown(null)).toBe(false));
});

describe('pageMarkdown', () => {
  test('renders the home page with a link to every tool', () => {
    const md = pageMarkdown('/')!;
    expect(md.startsWith('# Filemite')).toBe(true);
    for (const tool of tools) expect(md).toContain(`](${SITE_URL}${tool.href})`);
  });

  test('renders every tool page with steps and FAQs', () => {
    for (const tool of tools) {
      const md = pageMarkdown(tool.href)!;
      expect(md, tool.id).toContain(`# ${tool.title}`);
      expect(md, tool.id).toContain('## How to use');
      expect(md, tool.id).toContain('## Frequently asked questions');
    }
  });

  test('accepts a trailing slash and covers the legal and trust pages', () => {
    expect(pageMarkdown('/pdf/merge/')).toBe(pageMarkdown('/pdf/merge'));
    expect(pageMarkdown('/privacy')).toContain('# Privacy');
    expect(pageMarkdown('/terms')).toContain('# Terms');
    expect(pageMarkdown('/about')).toContain('# About Filemite');
    expect(pageMarkdown('/contact')).toContain('# Contact');
  });

  test('returns null for unknown paths', () => {
    expect(pageMarkdown('/nope')).toBeNull();
    expect(pageMarkdown('/api/health')).toBeNull();
  });
});

describe('responses', () => {
  test('Markdown carries the right type and Vary', async () => {
    const res = markdownResponse('# Hi', 200, false);
    expect(res.headers.get('content-type')).toMatch(/^text\/markdown/);
    expect(res.headers.get('vary')).toBe('Accept');
    expect(await res.text()).toBe('# Hi');
  });

  test('HEAD has headers and no body', async () => {
    const res = markdownResponse('# Hi', 200, true);
    expect(res.headers.get('content-type')).toMatch(/^text\/markdown/);
    expect(await res.text()).toBe('');
  });

  test('the 404 body explains the error and links llms.txt and the sitemap', () => {
    const md = notFoundMarkdown('/x`y\nz');
    expect(md.length).toBeGreaterThan(20);
    expect(md).toContain(`${SITE_URL}/llms.txt`);
    expect(md).toContain(`${SITE_URL}/sitemap.xml`);
    expect(md).not.toContain('\nz');
  });
});
