/** Brand and deployment settings — rename the product here. */

export const SITE_NAME = 'Micro Tools';
export const SITE_TAGLINE = 'Small, fast tools for images and PDFs.';
export const SITE_DESCRIPTION =
  'Compress, resize, crop and clean up images. Merge, split, extract and compress PDFs. Free, no sign-up, nothing stored.';

/** Absolute site origin (no trailing slash); override with VITE_SITE_URL. */
export const SITE_URL = String(
  import.meta.env.VITE_SITE_URL || 'https://micropng.sahilfruitwala.com',
).replace(/\/$/, '');

/** Public source — the AGPL requires offering it to users of the site. */
export const SOURCE_URL = 'https://github.com/SahilFruitwala/MicroPng';

export const AUTHOR = { name: 'Sahil Fruitwala', url: 'https://github.com/SahilFruitwala' };

export const SOCIAL_LINKS = [
  { href: 'https://github.com/SahilFruitwala', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/sahilfruitwala/', label: 'LinkedIn' },
  { href: 'https://x.com/sahilbeingsahil', label: 'X' },
  { href: 'https://instagram.com/its_sahilbeingsahil', label: 'Instagram' },
  { href: 'https://youtube.com/@sahilbeingsahil', label: 'YouTube' },
] as const;
