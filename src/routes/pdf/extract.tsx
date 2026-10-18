import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { ExtractTool } from '@/features/pdf/tools/extract-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-extract');

export const Route = createFileRoute('/pdf/extract')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <ExtractTool />
    </PdfToolPage>
  ),
});
