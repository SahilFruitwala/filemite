/**
 * Trust-anchor page copy shared by the HTML pages, Markdown negotiation and tests.
 * Agents check /about, /contact and /privacy for legitimacy — each body must stay ≥ 500 characters.
 */
import { AUTHOR, SITE_NAME, SOURCE_URL } from './site';
import { tools } from './tools';

export const TRUST_MIN_CHARS = 500;

const ISSUES_URL = `${SOURCE_URL}/issues`;

export type TrustSection = { heading: string; body: string };

export type TrustPage = {
  path: '/about' | '/contact' | '/privacy';
  title: string;
  intro: string;
  updated: string;
  sections: TrustSection[];
};

export const aboutPage: TrustPage = {
  path: '/about',
  title: `About ${SITE_NAME}`,
  intro: `${SITE_NAME} is a free collection of Filemite PDF tools and image tools. Each tool does one job well, without accounts, watermarks, or keeping a copy of your files.`,
  updated: 'October 24, 2026',
  sections: [
    {
      heading: 'What we build',
      body: `${SITE_NAME} ships focused utilities for everyday file work: compress, convert, resize, crop, redact and annotate images; merge, split, sign, redact and compress PDFs. There are ${tools.length} tools today, grouped into image and PDF sections so you can find the right one quickly. The product is intentionally small — no suite lock-in, no “pro” upsell, and no requirement to create an account before you can download a result.`,
    },
    {
      heading: 'Privacy by design',
      body: `PDF tools and most image tools run entirely in your browser, so those files never leave your device. A handful of image tools (compress, convert, resize, metadata removal and favicon) process uploads in memory on the server and discard them as soon as the response is sent — nothing is written to disk or object storage. That split lets heavy image work stay fast while keeping sensitive PDFs local. Full detail lives on the privacy page.`,
    },
    {
      heading: 'Who makes it',
      body: `${SITE_NAME} is an independent project by ${AUTHOR.name}, a software engineer who builds small free tools and publishes the source. The site is open source under the AGPL-3.0 on GitHub at ${SOURCE_URL}. If something is wrong, unclear, or missing, the best place to reach the project is the contact page.`,
    },
    {
      heading: 'Why it exists',
      body: `Most “free” file sites ask for an email, stamp a watermark, or upload every document to a server you cannot inspect. ${SITE_NAME} exists as a quieter alternative: open the tool, drop a file, download the result, and leave. Fair-use limits on server image tools keep the service responsive for everyone. No venture pitch, no advertising network — just useful Filemite PDF tools and image tools that respect the files you care about.`,
    },
  ],
};

export const contactPage: TrustPage = {
  path: '/contact',
  title: 'Contact',
  intro: `Reach the ${SITE_NAME} project for support, bug reports, security notes and product questions. Customer support is handled in public so fixes help everyone.`,
  updated: 'October 24, 2026',
  sections: [
    {
      heading: 'Customer support',
      body: `For help with Filemite PDF tools or image tools — a file that fails to process, a confusing control, a wrong result, or a feature request — open a GitHub issue at ${ISSUES_URL}. Include the tool URL, what you expected, what happened, and (when you can) the browser and operating system. Do not attach private documents to an issue; describe the problem instead. This is the primary customer-support channel for ${SITE_NAME}.`,
    },
    {
      heading: 'Security and privacy',
      body: `If you believe you have found a vulnerability or a privacy issue, still prefer a private-responsible path: file a GitHub security advisory on the repository when available, or open an issue marked as security-related without sharing exploit detail in public comments. Read how files are handled on the privacy page before assuming data was retained — in normal use, PDFs stay on your device and server image jobs are discarded from memory.`,
    },
    {
      heading: 'Who you are writing to',
      body: `${SITE_NAME} is maintained by ${AUTHOR.name}. There is no call centre, phone line, or shared inbox for day-to-day support; the project is small and answers through the public issue tracker so the same fix is visible to the next person. For background on the product, see the about page. Source code and contribution notes live at ${SOURCE_URL}.`,
    },
    {
      heading: 'Response expectations',
      body: `Issues are reviewed as time allows. Clear reproduction steps get faster answers than vague reports. Feature ideas are welcome, but the product stays intentionally narrow: one-job tools for images and PDFs, free to use, with privacy as a hard constraint. Automated bulk use that degrades the service for others is not supported — see the terms of service for fair-use rules. If your question is already covered in a tool’s on-page FAQ or in llms.txt, those pages are often the quickest way to an answer without waiting for a reply.`,
    },
  ],
};

/** Concatenated visible copy used to enforce the agent trust-page length bar. */
export function trustPageText(page: TrustPage): string {
  return [page.title, page.intro, ...page.sections.flatMap((s) => [s.heading, s.body])].join('\n');
}
