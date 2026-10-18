import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { MergeTool } from '@/features/pdf/tools/merge-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-merge');

export const Route = createFileRoute('/pdf/merge')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <MergeTool />
    </PdfToolPage>
  ),
});
