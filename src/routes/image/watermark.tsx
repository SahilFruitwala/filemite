import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { WatermarkTool } from '@/features/image/tools/watermark-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-watermark');

export const Route = createFileRoute('/image/watermark')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <WatermarkTool />
    </ToolPage>
  ),
});
