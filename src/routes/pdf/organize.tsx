import { createFileRoute } from '@tanstack/react-router';

import { PdfToolPage } from '@/features/pdf/pdf-tool-page';
import { OrganizeTool } from '@/features/pdf/tools/organize-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('pdf-organize');

export const Route = createFileRoute('/pdf/organize')({
  head: () => toolHead(tool),
  component: () => (
    <PdfToolPage tool={tool}>
      <OrganizeTool />
    </PdfToolPage>
  ),
});
