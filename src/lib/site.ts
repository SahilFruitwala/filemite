/** Brand and deployment settings — rename the product here. */

export const SITE_NAME = 'Filemite';
export const SITE_TAGLINE = 'Tiny tools for images and PDFs.';
export const SITE_DESCRIPTION =
  'Compress, convert, resize, crop and annotate images. Merge, split, sign, redact and compress PDFs. Free, no sign-up, nothing stored.';

/** Absolute site origin (no trailing slash); override with VITE_SITE_URL. */
export const SITE_URL = String(
  import.meta.env.VITE_SITE_URL || 'https://filemite.com',
).replace(/\/$/, '');

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
