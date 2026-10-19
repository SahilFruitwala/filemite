import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { ConvertTool } from '@/features/image/tools/convert-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-convert');

export const Route = createFileRoute('/image/convert')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <ConvertTool />
    </ToolPage>
  ),
});
