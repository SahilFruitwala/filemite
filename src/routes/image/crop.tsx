import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { CropTool } from '@/features/image/tools/crop-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-crop');

export const Route = createFileRoute('/image/crop')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <CropTool />
    </ToolPage>
  ),
});
