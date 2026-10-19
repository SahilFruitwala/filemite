import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { ToImagesTool } from '@/features/pdf/tools/to-images-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-to-images');

export const Route = createFileRoute('/pdf/to-images')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <ToImagesTool />
    </PdfToolPage>
  ),
});
