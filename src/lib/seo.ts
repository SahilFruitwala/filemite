import {
  ADDRESS,
  AUTHOR,
  CONTACT,
  OG_IMAGE,
  OG_IMAGE_ALT,
  SITE_DESCRIPTION,
  SITE_NAME,
  SOCIAL_LINKS,
  SOURCE_URL,
  SITE_URL,
} from './site';
import { siteFaqs, toolContent, type Faq } from './tool-content';
import { SECTIONS, tools, type Tool } from './tools';

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
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = path !== undefined ? `${SITE_URL}${path === '/' ? '' : path}` : undefined;
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      ...(keywords?.length ? [{ name: 'keywords', content: keywords.join(', ') }] : []),
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
      { property: 'og:image', content: OG_IMAGE },
      { property: 'og:image:alt', content: OG_IMAGE_ALT },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: OG_IMAGE },
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

const CONTEXT = 'https://schema.org';

/** The publisher entity, referenced by id from every page's markup. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** schema.org Person for the site author / Organization founder. */
export function personJsonLd() {
  return {
    '@type': 'Person' as const,
    name: AUTHOR.name,
    url: AUTHOR.url,
    description: AUTHOR.description,
    jobTitle: AUTHOR.jobTitle,
    sameAs: [...AUTHOR.sameAs],
    worksFor: { '@id': ORGANIZATION_ID },
  };
}

export function organizationJsonLd() {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/pwa-512.png`,
    sameAs: [SOURCE_URL, ...SOCIAL_LINKS.map((link) => link.href)],
    founder: personJsonLd(),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: CONTACT.url,
      ...(CONTACT.email ? { email: CONTACT.email } : {}),
      availableLanguage: 'en',
    },
    address: { '@type': 'PostalAddress', ...ADDRESS },
  };
}

function faqPage(faqs: Faq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

/** schema.org graph for a tool page: the app, its breadcrumb trail and its FAQ. */
export function toolJsonLd(tool: Tool) {
  const url = `${SITE_URL}${tool.href}`;
  const section = SECTIONS[tool.section];
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: `${tool.title} — ${SITE_NAME}`,
        url,
        description: tool.seoDescription,
        applicationCategory: tool.section === 'pdf' ? 'BusinessApplication' : 'MultimediaApplication',
        operatingSystem: 'Any (web browser)',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        inLanguage: 'en',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': ORGANIZATION_ID },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: section.title, item: `${SITE_URL}${section.href}` },
          { '@type': 'ListItem', position: 3, name: tool.title, item: url },
        ],
      },
      faqPage(toolContent[tool.id].faqs),
    ],
  };
}

/** schema.org graph for the home page: the tool catalogue and the site FAQ. */
export function homeJsonLd() {
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: HOME_TITLE,
        description: SITE_DESCRIPTION,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'ItemList',
        name: `${SITE_NAME} tools`,
        numberOfItems: tools.length,
        itemListElement: tools.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: tool.title,
          url: `${SITE_URL}${tool.href}`,
        })),
      },
      faqPage(siteFaqs),
    ],
  };
}

/** schema.org graph for a competitor alternative page: the page, its breadcrumb trail and its FAQ. */
export function alternativeJsonLd(alt: { slug: string; name: string; seoTitle: string; seoDescription: string; faqs: Faq[] }) {
  const url = `${SITE_URL}/alternatives/${alt.slug}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: alt.seoTitle,
        description: alt.seoDescription,
        publisher: { '@id': ORGANIZATION_ID },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Alternatives', item: `${SITE_URL}/alternatives` },
          { '@type': 'ListItem', position: 3, name: `${alt.name} alternative`, item: url },
        ],
      },
      faqPage(alt.faqs),
    ],
  };
}

/** Home page title: brand + main product phrasing that matches how people search. */
export const HOME_TITLE = 'Filemite PDF Tools & Image Tools — Free, Private, No Sign-Up';
