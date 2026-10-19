import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { BeautifyTool } from '@/features/image/tools/beautify-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-beautify');

export const Route = createFileRoute('/image/beautify')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <BeautifyTool />
    </ToolPage>
  ),
});
