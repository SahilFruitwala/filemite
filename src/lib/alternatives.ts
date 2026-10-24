/**
 * Competitor data for the /alternatives pages — the single source of truth for every claim
 * made about another product. Facts come from each competitor's own pricing page, checked on
 * `CHECKED`; re-verify them before changing that date. Write "not listed" rather than "no"
 * when a page is silent about something.
 */

import { formatBytes } from './format';
import { IMAGES_PER_HOUR, MAX_IMAGE_BATCH, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from './limits';
import type { Faq } from './tool-content';
import type { ToolId } from './tools';

export const CHECKED = 'October 24, 2026';

export type CompareRow = { label: string; filemite: string; them: string };

export type Alternative = {
  slug: string;
  name: string;
  /** What the competitor is, in their terms. */
  kind: string;
  site: string;
  pricingUrl: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  tldr: string;
  /** Why people look for another option — tied to facts in `rows`. */
  reasons: { title: string; text: string }[];
  rows: CompareRow[];
  /** When the competitor is the better choice. Keep this honest. */
  chooseThem: string[];
  chooseUs: string[];
  /** Filemite tools that replace the competitor's most used ones. */
  tools: ToolId[];
  faqs: Faq[];
};

const PDF_LIMIT = formatBytes(MAX_PDF_BYTES);
const IMAGE_LIMIT = formatBytes(MAX_IMAGE_BYTES);

const SHARED_ROWS = {
  account: { label: 'Account needed', filemite: 'No' },
  price: { label: 'Price', filemite: 'Free, no paid plan' },
  source: { label: 'Open source', filemite: 'Yes (AGPL-3.0)' },
} as const;

export const alternatives: Alternative[] = [
  {
    slug: 'ilovepdf',
    name: 'iLovePDF',
    kind: 'online PDF suite with a free plan and Premium subscription',
    site: 'https://www.ilovepdf.com',
    pricingUrl: 'https://www.ilovepdf.com/pricing',
    seoTitle: 'Free iLovePDF Alternative — No Task Limits, PDFs Never Uploaded',
    seoDescription:
      'Looking for an iLovePDF alternative? Filemite merges, splits, compresses, signs and redacts PDFs in your browser. Free, no account, files never uploaded.',
    keywords: [
      'ilovepdf alternative',
      'alternative to ilovepdf',
      'sites like ilovepdf',
      'ilovepdf free alternative',
      'ilovepdf without limits',
    ],
    tldr: 'iLovePDF has more tools, including Office conversion, OCR and desktop and mobile apps. Its free plan caps batch sizes and file sizes per task, and files are processed on its servers. Filemite covers the everyday jobs (merge, split, compress, sign, redact) for free, with no account, and PDFs never leave your device.',
    reasons: [
      {
        title: 'Free-plan caps per task',
        text: 'On the free Basic plan, iLovePDF lists 2 files per Compress PDF task, 1 per Redact and 3 per Sign, with file-size caps per tool. Premium removes most of these.',
      },
      {
        title: 'Files go to a server',
        text: 'iLovePDF processes documents on its servers (it advertises encryption, GDPR compliance and ISO 27001). Filemite’s PDF tools run on your device, so there is nothing to upload.',
      },
      {
        title: 'Ads on the free plan',
        text: 'iLovePDF lists an ad-free experience as a Premium feature. Filemite shows no ads.',
      },
    ],
    rows: [
      { ...SHARED_ROWS.price, them: 'Free Basic plan; Premium $5/month billed yearly or $9 monthly' },
      { ...SHARED_ROWS.account, them: 'Not for basic tools; required for Premium' },
      {
        label: 'Where PDFs are processed',
        filemite: 'In your browser — never uploaded',
        them: 'On iLovePDF servers',
      },
      { label: 'Compress PDF batch (free)', filemite: 'No daily cap', them: '2 files per task' },
      { label: 'Merge PDF (free)', filemite: '20 files per merge', them: '25 files per task' },
      { label: 'Max PDF size (free)', filemite: PDF_LIMIT, them: '15–400 MB depending on the tool' },
      { label: 'Ads', filemite: 'None', them: 'Removed on Premium' },
      { label: 'Office ↔ PDF, OCR', filemite: 'Not available', them: 'Yes' },
      { label: 'Desktop & mobile apps', filemite: 'Installable web app (PWA)', them: 'Yes, on Premium' },
      { label: 'Signature requests to others', filemite: 'Not available', them: 'Yes, via iLoveSign' },
      { ...SHARED_ROWS.source, them: 'No' },
    ],
    chooseThem: [
      'You need Word, Excel or PowerPoint conversion, OCR, or PDF/A.',
      'You send documents to other people for e-signature with an audit trail.',
      'Your team needs shared billing, SSO or regional processing.',
    ],
    chooseUs: [
      'You are handling IDs, contracts or payslips and would rather not upload them.',
      'You need a quick merge, split, compress, sign or redact without making an account.',
      'You keep hitting free-plan limits for occasional tasks you do not want to pay for.',
    ],
    tools: ['pdf-compress', 'pdf-merge', 'pdf-split', 'pdf-sign', 'pdf-redact', 'pdf-organize'],
    faqs: [
      {
        question: 'Is Filemite really free compared to iLovePDF Premium?',
        answer:
          'Yes. Filemite has no paid plan. Every tool is free and none needs an account. Fair-use limits apply only to image tools that run on the server.',
      },
      {
        question: 'Does Filemite upload my PDFs like iLovePDF does?',
        answer:
          'No. Filemite’s PDF tools run in your browser using MuPDF compiled to WebAssembly, so the file stays on your device. You can check the open-source code on GitHub.',
      },
      {
        question: 'What can iLovePDF do that Filemite cannot?',
        answer:
          'Convert between PDF and Word, Excel or PowerPoint, run OCR, convert to PDF/A, and send documents to others for signature. Filemite focuses on merging, splitting, compressing, signing, filling and redacting.',
      },
    ],
  },
  {
    slug: 'smallpdf',
    name: 'Smallpdf',
    kind: 'online PDF suite with a free plan and paid Pro and Team plans',
    site: 'https://smallpdf.com',
    pricingUrl: 'https://smallpdf.com/pricing',
    seoTitle: 'Free Smallpdf Alternative — No Download Limits, No Account',
    seoDescription:
      'A free Smallpdf alternative: compress, merge, split, sign and redact PDFs in your browser. No account, no daily download limit, files never uploaded.',
    keywords: [
      'smallpdf alternative',
      'alternative to smallpdf',
      'smallpdf free alternative',
      'sites like smallpdf',
      'smallpdf limit',
    ],
    tldr: 'Smallpdf offers 30+ tools, AI features and e-signatures, but its free plan lists limited and daily-capped downloads and basic compression only. Filemite is free with no account and no daily limit, and PDFs are processed on your own device.',
    reasons: [
      {
        title: 'Daily download limits',
        text: 'Smallpdf’s pricing page lists “limited document downloads” and a “daily download limit” on the free plan.',
      },
      {
        title: 'Basic compression only on free',
        text: 'Free Smallpdf lists “Basic Compression”; stronger compression is a paid feature. Filemite offers quality presets or a target file size for free.',
      },
      {
        title: 'Files go to a server',
        text: 'Smallpdf processes files in the cloud. Filemite’s PDF tools run on your device.',
      },
    ],
    rows: [
      { ...SHARED_ROWS.price, them: 'Free plan with limits; paid Pro and Team plans' },
      { ...SHARED_ROWS.account, them: 'Needed for some features, such as sharing' },
      {
        label: 'Where PDFs are processed',
        filemite: 'In your browser — never uploaded',
        them: 'On Smallpdf servers',
      },
      { label: 'Downloads (free)', filemite: 'Unlimited', them: 'Daily download limit' },
      { label: 'PDF compression (free)', filemite: 'Quality presets or target size', them: 'Basic compression' },
      { label: 'Max PDF size (free)', filemite: PDF_LIMIT, them: 'Listed as “Limited”' },
      { label: 'AI tools (chat, summarize, translate)', filemite: 'Not available', them: 'Yes, limited on free' },
      { label: 'Office ↔ PDF conversion', filemite: 'Not available', them: 'Yes' },
      { label: 'True redaction', filemite: 'Yes — content under the box is deleted', them: 'Not listed on their pricing page' },
      { ...SHARED_ROWS.source, them: 'No' },
    ],
    chooseThem: [
      'You want AI summaries, translation or chat with a PDF.',
      'You convert Office files to and from PDF often.',
      'You need a team workspace and e-signature requests.',
    ],
    chooseUs: [
      'You hit the free download limit and only need a few quick tasks.',
      'You want to shrink a PDF to a specific size, such as under 2 MB for a portal.',
      'You would rather not send sensitive documents to a cloud service.',
    ],
    tools: ['pdf-compress', 'pdf-merge', 'pdf-sign', 'pdf-annotate', 'pdf-redact', 'pdf-to-images'],
    faqs: [
      {
        question: 'Does Filemite have a daily limit like Smallpdf?',
        answer:
          'Not for PDFs. PDF tools run on your device, so there is no daily or download cap. Image tools that run on the server allow ' +
          `${IMAGES_PER_HOUR} images an hour to keep things fast for everyone.`,
      },
      {
        question: 'Can I compress a PDF to a specific size?',
        answer:
          'Yes. Filemite’s Compress PDF tool can aim for a target size, or you can pick a quality level. Text stays sharp because only images are recompressed.',
      },
      {
        question: 'Is Filemite as safe as Smallpdf?',
        answer:
          'Filemite takes a different approach: PDFs are never uploaded, so there is no copy on anyone’s server to protect. The code is open source so anyone can check this.',
      },
    ],
  },
  {
    slug: 'tinypng',
    name: 'TinyPNG',
    kind: 'image compression service with a free web tool, paid web plans and a developer API',
    site: 'https://tinypng.com',
    pricingUrl: 'https://tinypng.com/pricing/web',
    seoTitle: 'Free TinyPNG Alternative — Compress PNG, JPEG, WebP & HEIC',
    seoDescription:
      'A free TinyPNG alternative: compress PNG, JPEG, WebP and HEIC images, then resize, convert or strip metadata. No account, nothing stored.',
    keywords: [
      'tinypng alternative',
      'alternative to tinypng',
      'tinypng free alternative',
      'tinypng limit',
      'compress png like tinypng',
    ],
    tldr: 'TinyPNG is an excellent compressor with an API, a WordPress plugin and AVIF support. Its free web tool lists 20 compressions per session and 5 MB per image. Filemite compresses PNG, JPEG, WebP and HEIC for free, and sits next to resize, convert, crop and metadata tools in the same app.',
    reasons: [
      {
        title: 'Session and size caps',
        text: 'TinyPNG’s free web plan lists a maximum of 20 compressions and 3 conversions per session, and 5 MB per image.',
      },
      {
        title: 'Compression is only one step',
        text: 'Often you also need to resize, crop, convert HEIC or strip GPS data. Filemite does all of these in one place.',
      },
      {
        title: 'Ads on the free plan',
        text: 'TinyPNG lists ad-free use as a paid web feature. Filemite shows no ads.',
      },
    ],
    rows: [
      { ...SHARED_ROWS.price, them: 'Free web tool; Web Pro from $3.25/month and Ultra from $12.42/month, billed yearly' },
      { ...SHARED_ROWS.account, them: 'Not for the free web tool' },
      {
        label: 'Free compressions',
        filemite: `${MAX_IMAGE_BATCH} per batch, ${IMAGES_PER_HOUR} an hour`,
        them: '20 per session',
      },
      { label: 'Max image size (free)', filemite: `${IMAGE_LIMIT} on the server, larger files compress in your browser`, them: '5 MB' },
      { label: 'Formats', filemite: 'PNG, JPEG, WebP, HEIC', them: 'AVIF, WebP, PNG, JPEG' },
      { label: 'HEIC (iPhone photos)', filemite: 'Yes', them: 'Not listed on their pricing page' },
      { label: 'Resize, crop, strip metadata', filemite: 'Yes, separate tools', them: 'Resize via the API' },
      { label: 'Developer API & WordPress plugin', filemite: 'Not available', them: 'Yes' },
      { label: 'Ads', filemite: 'None', them: 'Removed on paid web plans' },
      { ...SHARED_ROWS.source, them: 'No' },
    ],
    chooseThem: [
      'You need an API or WordPress plugin to compress images automatically.',
      'You want AVIF output.',
      'You compress very large images (up to 75–150 MB) on a paid plan.',
    ],
    chooseUs: [
      'You want to compress iPhone HEIC photos or convert them to JPG.',
      'You also need to resize, crop or remove location data from the same photos.',
      'You run out of free compressions and do not need a subscription.',
    ],
    tools: ['image-compress', 'image-convert', 'image-resize', 'image-scrub', 'image-crop', 'image-favicon'],
    faqs: [
      {
        question: 'Does Filemite compress PNG as well as TinyPNG?',
        answer:
          'Filemite uses Sharp with quantised palettes for PNG and mozjpeg for JPEG, and offers Best, Balanced and Smallest presets. Results are comparable for most images; try both with your own files.',
      },
      {
        question: 'Is there a limit on how many images I can compress?',
        answer: `Up to ${MAX_IMAGE_BATCH} images per batch and ${IMAGES_PER_HOUR} an hour, which keeps the free server fast for everyone. There is no per-session cap.`,
      },
      {
        question: 'Are my images stored?',
        answer:
          'No. Images are processed in memory and discarded as soon as the result is sent back. Nothing is written to disk.',
      },
    ],
  },
];

export function getAlternative(slug: string): Alternative | undefined {
  return alternatives.find((alt) => alt.slug === slug);
}
