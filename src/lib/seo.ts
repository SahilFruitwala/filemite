import { SITE_NAME, SITE_URL } from './site';
import type { Tool } from './tools';

export { SITE_URL };

interface SeoOptions {
  title: string;
  description: string;
  keywords?: string[];
  /** Path portion of the canonical URL, e.g. "/image/crop". */
  path?: string;
}

/** Builds a TanStack Router `head()` result with title, description, OG/Twitter tags and canonical link. */
export function seoHead({ title, description, keywords, path }: SeoOptions) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const canonical = path !== undefined ? `${SITE_URL}${path === '/' ? '' : path}` : undefined;
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      ...(keywords?.length ? [{ name: 'keywords', content: keywords.join(', ') }] : []),
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
    ],
    links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
  };
}

export function toolHead(tool: Tool) {
  return seoHead({
    title: tool.seoTitle,
    description: tool.seoDescription,
    keywords: tool.keywords,
    path: tool.href,
  });
}

/** schema.org SoftwareApplication payload for a tool page. */
export function toolJsonLd(tool: Tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${tool.title} — ${SITE_NAME}`,
    url: `${SITE_URL}${tool.href}`,
    applicationCategory: tool.section === 'pdf' ? 'BusinessApplication' : 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: tool.seoDescription,
  };
}
