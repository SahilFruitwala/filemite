/** Brand and deployment settings — rename the product here. */

export const SITE_NAME = 'Filemite';
export const SITE_TAGLINE = 'Filemite PDF tools and image tools — private and free.';
export const SITE_DESCRIPTION =
  'Filemite PDF tools and image tools: compress, convert, resize, crop and annotate images; merge, split, sign, redact and compress PDFs. Free, no sign-up, nothing stored.';

/**
 * Absolute site origin (no trailing slash). Deliberately not an env var: a stale
 * VITE_SITE_URL once pointed og:image and canonical links at a retired domain.
 * `filemite.com` redirects here, so this is the host that serves pages directly.
 */
export const SITE_URL = 'https://www.filemite.com';

/** Social preview card (1200×630 PNG in /public). */
export const OG_IMAGE = `${SITE_URL}/opengraph.png`;
export const OG_IMAGE_ALT = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** Public source — the AGPL requires offering it to users of the site. */
export const SOURCE_URL = 'https://github.com/SahilFruitwala/filemite';

export const SOCIAL_LINKS = [
  { href: 'https://github.com/SahilFruitwala', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/sahilfruitwala/', label: 'LinkedIn' },
  { href: 'https://x.com/sahilbeingsahil', label: 'X' },
  { href: 'https://instagram.com/its_sahilbeingsahil', label: 'Instagram' },
  { href: 'https://youtube.com/@sahilbeingsahil', label: 'YouTube' },
] as const;

export const AUTHOR = {
  name: 'Sahil Fruitwala',
  url: 'https://github.com/SahilFruitwala',
  description:
    'Software engineer and creator of Filemite, a free site of private PDF tools and image tools that run in the browser or process files in memory without storing them.',
  jobTitle: 'Software Engineer',
  sameAs: [
    'https://github.com/SahilFruitwala',
    'https://www.linkedin.com/in/sahilfruitwala/',
    'https://x.com/sahilbeingsahil',
    'https://sahilfruitwala.com/',
  ] as const,
};

/**
 * Public contact details for the Organization markup. Support runs through GitHub issues.
 * Set `email` to publish a support address as well.
 */
export const CONTACT: { url: string; email?: string } = {
  url: `${SITE_URL}/contact`,
};

/**
 * Postal address for the Organization markup. City-level only — no street address —
 * matching the location the founder publishes publicly (Waterloo, Canada).
 */
export const ADDRESS: {
  streetAddress?: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
} = {
  addressLocality: 'Waterloo',
  addressRegion: 'ON',
  addressCountry: 'CA',
};
