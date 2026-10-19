import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { CollageTool } from '@/features/image/tools/collage-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-collage');

export const Route = createFileRoute('/image/collage')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <CollageTool />
    </ToolPage>
  ),
});
