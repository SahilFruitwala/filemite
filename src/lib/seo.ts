export const SITE_URL = 'https://micropng.sahilfruitwala.com';

interface SeoOptions {
  title: string;
  description: string;
  keywords?: string[];
  /** Path portion of the canonical URL, e.g. "/crop". */
  path?: string;
}

/** Builds a TanStack Router `head()` result with title, description, OG/Twitter tags, and canonical link. */
export function seoHead({ title, description, keywords, path }: SeoOptions) {
  const fullTitle = `${title} | MicroPNG`;
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

interface SoftwareAppJsonLdOptions {
  name: string;
  category: string;
  description: string;
  rating?: string;
  ratingCount?: string;
}

/** schema.org SoftwareApplication JSON-LD payload shared by the tool pages. */
export function softwareAppJsonLd({
  name,
  category,
  description,
  rating,
  ratingCount,
}: SoftwareAppJsonLdOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    applicationCategory: category,
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description,
    ...(rating && ratingCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            ratingCount,
          },
        }
      : {}),
  };
}
