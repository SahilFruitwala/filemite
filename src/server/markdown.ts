/**
 * Markdown content negotiation: a request that prefers `text/markdown` gets a Markdown
 * rendering of the page at the same URL, with `Vary: Accept`. Everything else still gets HTML.
 * The Markdown is built from the same tool list and copy as the pages, so it can't drift.
 */
import { HOME_TITLE } from '@/lib/seo';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOURCE_URL } from '@/lib/site';
import { siteFaqs, toolContent, type Faq } from '@/lib/tool-content';
import { SECTIONS, toolsIn, tools, type Section } from '@/lib/tools';
import { aboutPage, contactPage, type TrustPage } from '@/lib/trust-content';

/** The q-value the client gave a media type, or 0 when it is not listed (wildcards don't count). */
function preference(accept: string, type: string) {
  const entries = accept.split(',').map((part) => part.trim().toLowerCase());
  const index = entries.findIndex((entry) => entry.split(';')[0].trim() === type);
  if (index === -1) return { q: 0, index };
  const q = /;\s*q=([\d.]+)/.exec(entries[index])?.[1];
  const value = q === undefined ? 1 : Number(q);
  return { q: Number.isFinite(value) ? value : 0, index };
}

/** True when the client asks for Markdown ahead of HTML. Browsers never list `text/markdown`. */
export function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const md = preference(accept, 'text/markdown');
  if (md.q <= 0) return false;
  const html = preference(accept, 'text/html');
  return md.q > html.q || (md.q === html.q && (html.index === -1 || md.index < html.index));
}

const faqs = (items: Faq[]) =>
  items.map(({ question, answer }) => `### ${question}\n\n${answer}`).join('\n\n');

const footer = `---\n\nMore: [llms.txt](${SITE_URL}/llms.txt) · [Sitemap](${SITE_URL}/sitemap.xml) · [Source code](${SOURCE_URL})`;

function homeMarkdown(): string {
  const section = (id: Section) =>
    [
      `## ${SECTIONS[id].title}`,
      ...toolsIn(id).map((tool) => `- [${tool.title}](${SITE_URL}${tool.href}): ${tool.description}`),
    ].join('\n');
  return [
    `# ${HOME_TITLE}`,
    `> ${SITE_DESCRIPTION}`,
    section('image'),
    section('pdf'),
    `## Frequently asked questions\n\n${faqs(siteFaqs)}`,
    footer,
  ].join('\n\n');
}

function toolMarkdown(href: string): string | null {
  const tool = tools.find((item) => item.href === href);
  if (!tool) return null;
  const { summary, steps, faqs: toolFaqs } = toolContent[tool.id];
  const where =
    tool.processing === 'browser'
      ? 'Runs in your browser — nothing is uploaded.'
      : 'Processed in memory on the server and never stored.';
  return [
    `# ${tool.title} — ${SITE_NAME}`,
    `> ${tool.seoDescription}`,
    summary,
    `Privacy: ${where}`,
    `## How to use\n\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`,
    `## Frequently asked questions\n\n${faqs(toolFaqs)}`,
    `## More ${SECTIONS[tool.section].title.toLowerCase()}\n\n${toolsIn(tool.section)
      .filter((item) => item.id !== tool.id)
      .map((item) => `- [${item.title}](${SITE_URL}${item.href})`)
      .join('\n')}`,
    footer,
  ].join('\n\n');
}

const TRUST: Record<string, TrustPage> = {
  '/about': aboutPage,
  '/contact': contactPage,
};

const LEGAL: Record<string, { title: string; summary: string }> = {
  '/privacy': {
    title: 'Privacy',
    summary: `Your files are yours. PDF tools and most image tools run entirely on your device. The compress, convert, resize, metadata-removal and favicon image tools process images in memory on the server and never store them. ${SITE_NAME} uses cookieless, anonymous usage analytics. Server tools process images in memory with Sharp and stream the result back without writing to disk. Browser tools never upload files. Abuse protection counts requests per IP in memory only. Analytics via PostHog are cookieless and anonymous: page views, tool events and errors, never file contents or names.`,
  },
  '/terms': {
    title: 'Terms',
    summary: `The terms of use for ${SITE_NAME}. By using the service you agree the tools are provided free, as is and as available, without warranties. You are responsible for the files you process and must not use the tools for illegal content. Server-side tools are rate limited; automated bulk use that degrades the service is not allowed. To the fullest extent permitted by law, ${SITE_NAME} and its creator are not liable for indirect or consequential damages or loss of data. Keep your originals. Terms may be updated on this page with a new revision date.`,
  },
};

function trustMarkdown(page: TrustPage): string {
  return [
    `# ${page.title} — ${SITE_NAME}`,
    page.intro,
    ...page.sections.map((section) => `## ${section.heading}\n\n${section.body}`),
    `Last updated ${page.updated}`,
    footer,
  ].join('\n\n');
}

/** Markdown for a page that exists, or null when the path is not a known page. */
export function pageMarkdown(pathname: string): string | null {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/') return homeMarkdown();
  const trust = TRUST[path];
  if (trust) return trustMarkdown(trust);
  const legal = LEGAL[path];
  if (legal) {
    return [
      `# ${legal.title} — ${SITE_NAME}`,
      legal.summary,
      `Full text: ${SITE_URL}${path}`,
      footer,
    ].join('\n\n');
  }
  return toolMarkdown(path);
}

export function notFoundMarkdown(pathname: string): string {
  return [
    '# 404 — Page not found',
    `There is no page at \`${pathname.replace(/[`\r\n]/g, '')}\` on ${SITE_NAME}. It may have moved or never existed.`,
    `Start from the [tool list in llms.txt](${SITE_URL}/llms.txt), the [sitemap](${SITE_URL}/sitemap.xml) or the [home page](${SITE_URL}/).`,
  ].join('\n\n');
}

export function markdownResponse(body: string, status: number, headOnly: boolean): Response {
  return new Response(headOnly ? null : body, {
    status,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' },
  });
}
