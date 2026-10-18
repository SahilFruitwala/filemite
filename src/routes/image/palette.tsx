import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { PaletteTool } from '@/features/image/tools/palette-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-palette');

export const Route = createFileRoute('/image/palette')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <PaletteTool />
    </ToolPage>
  ),
});
