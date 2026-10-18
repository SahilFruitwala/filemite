import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { ResizeTool } from '@/features/image/tools/resize-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-resize');

export const Route = createFileRoute('/image/resize')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <ResizeTool />
    </ToolPage>
  ),
});
