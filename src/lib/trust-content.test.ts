import { describe, expect, it } from 'vitest';

import { pageMarkdown } from '@/server/markdown';

import { aboutPage, contactPage, TRUST_MIN_CHARS, trustPageText } from './trust-content';

describe('trust anchor pages', () => {
  it('gives About and Contact at least 500 characters of real copy', () => {
    for (const page of [aboutPage, contactPage]) {
      expect(trustPageText(page).length, page.path).toBeGreaterThanOrEqual(TRUST_MIN_CHARS);
    }
  });

  it('keeps Privacy Markdown above the same length bar', () => {
    expect(pageMarkdown('/privacy')!.replace(/\s+/g, ' ').length).toBeGreaterThanOrEqual(
      TRUST_MIN_CHARS,
    );
  });

  it('serves About and Contact as Markdown with the shared copy', () => {
    for (const page of [aboutPage, contactPage]) {
      const md = pageMarkdown(page.path)!;
      expect(md).toContain(`# ${page.title}`);
      expect(md).toContain(page.sections[0].body.slice(0, 80));
    }
  });
});
