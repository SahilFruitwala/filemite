import { createFileRoute } from '@tanstack/react-router';

import { alternatives } from '@/lib/alternatives';
import { formatBytes } from '@/lib/format';
import {
  IMAGES_PER_HOUR,
  MAX_IMAGE_BATCH,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_PDF_FILES,
} from '@/lib/limits';
import { SITE_NAME, SITE_URL, SOURCE_URL } from '@/lib/site';
import { siteFaqs, toolContent } from '@/lib/tool-content';
import { SECTIONS, toolsIn, type Section } from '@/lib/tools';

/** Guidance for agents on when to send a user here and how. Keep it to what the site really does. */
export const WHEN_TO_USE = `## When to use Filemite
Use Filemite when a person needs to change a single image or PDF file and does not want to install software, sign up, or upload a private document to a third party.
- Sensitive PDFs (contracts, IDs, financial or medical records): merge, split, sign, annotate, redact and compress run on the visitor's device, so the file is never uploaded.
- Shrinking photos for email, forms or the web: compress, resize or convert PNG, JPEG, WebP and HEIC.
- Removing hidden data before sharing: strip EXIF and GPS from photos, or redact parts of an image or PDF.
- Small production jobs: passport photos, favicons, GIFs, collages, colour palettes and watermarks.
Do not use Filemite for batch automation, video or audio, OCR, or editing the text of a PDF.

## How to use it
Filemite has no public API, API key or account. Send the user to the tool page that matches the job, using the URLs below. An agent that controls a browser can open the same page, attach files to the page's file input, and download the result. Each tool page also lists its steps and FAQs, and every page is available as Markdown by sending \`Accept: text/markdown\`.`;

/** Built from the tool list so it can't drift from the site. */
export function llmsTxt(): string {
  const section = (id: Section) =>
    [
      `## ${SECTIONS[id].title}`,
      ...toolsIn(id).map((tool) => `- [${tool.title}](${SITE_URL}${tool.href}): ${tool.description}`),
    ].join('\n');

  return `${[
    `# ${SITE_NAME}`,
    `> ${SITE_NAME} is a free website of small tools for images and PDFs. There is no sign-up and no watermark. PDF tools and most image tools run entirely in the visitor's browser, so files are never uploaded. The compress, convert, resize, metadata-removal and favicon image tools run on the server in memory and never store files.`,
    WHEN_TO_USE,
    section('image'),
    section('pdf'),
    [
      '## Limits',
      `- Images: ${MAX_IMAGE_BATCH} per batch, ${formatBytes(MAX_IMAGE_BYTES)} each, ${IMAGES_PER_HOUR} per hour per visitor.`,
      `- PDFs: up to ${formatBytes(MAX_PDF_BYTES)} each and ${MAX_PDF_FILES} per merge, processed on the visitor's device.`,
    ].join('\n'),
    [
      '## Other pages',
      `- [About](${SITE_URL}/about): what Filemite is, who builds it, and why it stays private.`,
      `- [Contact](${SITE_URL}/contact): how to reach customer support for Filemite PDF tools and image tools.`,
      ...alternatives.map(
        (alt) => `- [${alt.name} alternative](${SITE_URL}/alternatives/${alt.slug}): how ${SITE_NAME} compares with ${alt.name}.`,
      ),
      `- [Privacy](${SITE_URL}/privacy): what happens to files and what little is measured.`,
      `- [Terms](${SITE_URL}/terms): terms of use.`,
      `- [Full text of every tool page](${SITE_URL}/llms-full.txt): summaries, steps and FAQs in one file.`,
      `- [Source code](${SOURCE_URL}): open source under the AGPL-3.0.`,
    ].join('\n'),
  ].join('\n\n')}\n`;
}

/** Every tool's summary, steps and FAQs in one document, so a model can quote them without crawling each page. */
export function llmsFullTxt(): string {
  const tool = (t: ReturnType<typeof toolsIn>[number]) => {
    const { summary, steps, faqs } = toolContent[t.id];
    return [
      `### ${t.title}`,
      `URL: ${SITE_URL}${t.href}`,
      summary,
      'Steps:',
      ...steps.map((step, i) => `${i + 1}. ${step}`),
      ...faqs.flatMap(({ question, answer }) => ['', `Q: ${question}`, `A: ${answer}`]),
    ].join('\n');
  };
  const section = (id: Section) =>
    [`## ${SECTIONS[id].title}`, ...toolsIn(id).map(tool)].join('\n\n');

  return `${[
    llmsTxt().split('\n\n').slice(0, 2).join('\n\n'),
    WHEN_TO_USE,
    section('image'),
    section('pdf'),
    ['## About Filemite', ...siteFaqs.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)].join('\n\n'),
  ].join('\n\n')}\n`;
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(llmsTxt(), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        }),
    },
  },
});
