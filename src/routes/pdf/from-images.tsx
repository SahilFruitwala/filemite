import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { FromImagesTool } from '@/features/pdf/tools/from-images-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-from-images');

export const Route = createFileRoute('/pdf/from-images')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <FromImagesTool />
    </PdfToolPage>
  ),
});
