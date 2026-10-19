import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { AnnotateTool } from '@/features/pdf/tools/annotate-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-annotate');

export const Route = createFileRoute('/pdf/annotate')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <AnnotateTool />
    </PdfToolPage>
  ),
});
