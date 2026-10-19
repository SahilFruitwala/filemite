import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { RedactTool } from '@/features/pdf/tools/redact-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-redact');

export const Route = createFileRoute('/pdf/redact')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <RedactTool />
    </PdfToolPage>
  ),
});
