import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { RotateTool } from '@/features/image/tools/rotate-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-rotate');

export const Route = createFileRoute('/image/rotate')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <RotateTool />
    </ToolPage>
  ),
});
