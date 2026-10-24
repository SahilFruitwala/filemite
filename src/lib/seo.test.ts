import { describe, expect, it } from 'vitest';

import { llmsFullTxt, llmsTxt } from '@/routes/llms[.]txt';
import { robotsTxt } from '@/routes/robots[.]txt';
import {
  HOME_TITLE,
  homeJsonLd,
  organizationJsonLd,
  personJsonLd,
  seoHead,
  toolHead,
  toolJsonLd,
} from './seo';
import { ADDRESS, AUTHOR, SITE_URL } from './site';
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

  it('names Filemite PDF tools on the home WebPage node', () => {
    const graph = homeJsonLd()['@graph'];
    const page = graph.find((node) => node['@type'] === 'WebPage') as { name: string };
    expect(page.name.toLowerCase()).toContain('filemite pdf tools');
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
    expect(text).toContain(`](${SITE_URL}/about)`);
    expect(text).toContain(`](${SITE_URL}/contact)`);
  });
});

describe('llms-full.txt', () => {
  it('includes the steps and FAQs of every tool', () => {
    const text = llmsFullTxt();
    for (const tool of tools) {
      expect(text).toContain(`URL: ${SITE_URL}${tool.href}`);
      expect(text).toContain(toolContent[tool.id].faqs[0].answer);
    }
  });
});

describe('llms.txt guidance', () => {
  it('tells agents when to use the site, in both files', () => {
    for (const text of [llmsTxt(), llmsFullTxt()]) {
      expect(text).toContain('## When to use Filemite');
      expect(text).toContain('## How to use it');
    }
  });
});

describe('organization markup', () => {
  it('publishes a contact point and a PostalAddress', () => {
    const org = organizationJsonLd();
    expect(org.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/contact`,
    });
    expect(org.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: ADDRESS.addressLocality,
      addressRegion: ADDRESS.addressRegion,
      addressCountry: ADDRESS.addressCountry,
    });
  });
});

describe('person markup', () => {
  it('includes description and sameAs, jobTitle and worksFor', () => {
    const person = personJsonLd();
    expect(person.name).toBe(AUTHOR.name);
    expect(person.description.length).toBeGreaterThan(40);
    expect(person.jobTitle).toBe(AUTHOR.jobTitle);
    expect(person.sameAs).toEqual([...AUTHOR.sameAs]);
    expect(person.worksFor).toEqual({ '@id': `${SITE_URL}/#organization` });
  });

  it('is reused as the Organization founder', () => {
    expect(organizationJsonLd().founder).toEqual(personJsonLd());
  });
});

describe('brand discoverability', () => {
  it('names Filemite PDF tools in the home title', () => {
    expect(HOME_TITLE.toLowerCase()).toContain('filemite pdf tools');
    const title = (seoHead({ title: HOME_TITLE, description: 'x', path: '/' }).meta[0] as { title: string })
      .title;
    expect(title.toLowerCase()).toContain('filemite pdf tools');
  });
});
