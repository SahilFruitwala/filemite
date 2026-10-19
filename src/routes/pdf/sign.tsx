import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { SignTool } from '@/features/pdf/tools/sign-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-sign');

export const Route = createFileRoute('/pdf/sign')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <SignTool />
    </PdfToolPage>
  ),
});
