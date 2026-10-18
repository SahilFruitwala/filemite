import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { FaviconTool } from '@/features/image/tools/favicon-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-favicon');

export const Route = createFileRoute('/image/favicon')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <FaviconTool />
    </ToolPage>
  ),
});
