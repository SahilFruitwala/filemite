import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { ScrubTool } from '@/features/image/tools/scrub-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-scrub');

export const Route = createFileRoute('/image/scrub')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <ScrubTool />
    </ToolPage>
  ),
});
