import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { SplitTool } from '@/features/pdf/tools/split-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-split');

export const Route = createFileRoute('/pdf/split')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <SplitTool />
    </PdfToolPage>
  ),
});
