/** Brand and deployment settings — rename the product here. */

export const SITE_NAME = 'Filemite';
export const SITE_TAGLINE = 'Tiny tools for images and PDFs.';
export const SITE_DESCRIPTION =
  'Compress, convert, resize, crop and annotate images. Merge, split, sign, redact and compress PDFs. Free, no sign-up, nothing stored.';

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

export const AUTHOR = { name: 'Sahil Fruitwala', url: 'https://github.com/SahilFruitwala' };

export const SOCIAL_LINKS = [
  { href: 'https://github.com/SahilFruitwala', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/sahilfruitwala/', label: 'LinkedIn' },
  { href: 'https://x.com/sahilbeingsahil', label: 'X' },
  { href: 'https://instagram.com/its_sahilbeingsahil', label: 'Instagram' },
  { href: 'https://youtube.com/@sahilbeingsahil', label: 'YouTube' },
] as const;

/**
 * Public contact details for the Organization markup. Support runs through GitHub issues.
 * Set `email` to publish a support address as well.
 */
export const CONTACT: { url: string; email?: string } = { url: `${SOURCE_URL}/issues` };

/**
 * Postal address for the Organization markup. Left unset on purpose: it is published as
 * written, so it needs a real address the owner is happy to make public.
 */
export const ADDRESS:
  | {
      streetAddress?: string;
      addressLocality: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry: string;
    }
  | undefined = undefined;
