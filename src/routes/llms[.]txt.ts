import { createFileRoute } from '@tanstack/react-router';

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
    section('image'),
    section('pdf'),
    [
      '## Limits',
      `- Images: ${MAX_IMAGE_BATCH} per batch, ${formatBytes(MAX_IMAGE_BYTES)} each, ${IMAGES_PER_HOUR} per hour per visitor.`,
      `- PDFs: up to ${formatBytes(MAX_PDF_BYTES)} each and ${MAX_PDF_FILES} per merge, processed on the visitor's device.`,
    ].join('\n'),
    [
      '## Other pages',
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
