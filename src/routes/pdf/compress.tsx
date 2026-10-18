import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { CompressTool } from '@/features/pdf/tools/compress-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-compress');

export const Route = createFileRoute('/pdf/compress')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <CompressTool />
    </PdfToolPage>
  ),
});
