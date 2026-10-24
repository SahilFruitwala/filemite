import { describe, expect, it } from 'vitest';

import { llmsTxt } from '@/routes/llms[.]txt';
import { robotsTxt } from '@/routes/robots[.]txt';
import { homeJsonLd, seoHead, toolHead, toolJsonLd } from './seo';
import { SITE_URL } from './site';
import { siteFaqs, toolContent } from './tool-content';
import { tools } from './tools';

describe('tool content', () => {
  it('covers every tool with steps and FAQs', () => {
    for (const tool of tools) {
      const content = toolContent[tool.id];
      expect(content, tool.id).toBeDefined();
      expect(content.steps.length, tool.id).toBeGreaterThanOrEqual(3);
      expect(content.faqs.length, tool.id).toBeGreaterThanOrEqual(2);
      expect(content.summary.length, tool.id).toBeGreaterThan(80);
    }
  });
});

describe('tool metadata', () => {
  it('gives each tool a unique title and description of a searchable length', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const tool of tools) {
      const meta = toolHead(tool).meta;
      const title = (meta.find((m) => 'title' in m) as { title: string }).title;
      expect(title.length, title).toBeLessThanOrEqual(75);
      expect(tool.seoDescription.length, tool.id).toBeLessThanOrEqual(200);
      titles.add(title);
      descriptions.add(tool.seoDescription);
    }
    expect(titles.size).toBe(tools.length);
    expect(descriptions.size).toBe(tools.length);
  });

  it('sets an absolute self-referencing canonical', () => {
    for (const tool of tools) {
      expect(toolHead(tool).links).toEqual([{ rel: 'canonical', href: `${SITE_URL}${tool.href}` }]);
    }
  });

  it('does not repeat the brand when the title already has it', () => {
    const title = (seoHead({ title: 'Filemite — Free Tools', description: 'x' }).meta[0] as { title: string }).title;
    expect(title).toBe('Filemite — Free Tools');
  });
});

describe('structured data', () => {
  it('describes a tool as an app with breadcrumbs and an FAQ', () => {
    const graph = toolJsonLd(tools[0])['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['WebApplication', 'BreadcrumbList', 'FAQPage']);
    const crumbs = graph[1] as { itemListElement: { item: string }[] };
    expect(crumbs.itemListElement.at(-1)?.item).toBe(`${SITE_URL}${tools[0].href}`);
  });

  it('lists every tool on the home page', () => {
    const graph = homeJsonLd()['@graph'];
    const list = graph.find((node) => node['@type'] === 'ItemList') as { numberOfItems: number };
    expect(list.numberOfItems).toBe(tools.length);
    expect(siteFaqs.length).toBeGreaterThan(0);
  });
});

describe('robots.txt', () => {
  it('keeps private paths blocked for every crawler group and links the sitemap', () => {
    const groups = robotsTxt.split('\n\n').filter((group) => group.startsWith('User-agent'));
    expect(groups.length).toBeGreaterThan(1);
    for (const group of groups) expect(group).toContain('Disallow: /api/');
    expect(robotsTxt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(robotsTxt).toContain('User-agent: OAI-SearchBot');
  });
});

describe('llms.txt', () => {
  it('follows the llms.txt format and links every tool', () => {
    const text = llmsTxt();
    expect(text.startsWith('# Filemite\n\n> ')).toBe(true);
    for (const tool of tools) expect(text).toContain(`](${SITE_URL}${tool.href})`);
  });
});
