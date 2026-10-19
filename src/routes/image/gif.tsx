import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { GifTool } from '@/features/image/tools/gif-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-gif');

export const Route = createFileRoute('/image/gif')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <GifTool />
    </ToolPage>
  ),
});
