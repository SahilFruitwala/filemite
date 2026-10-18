import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { CompressTool } from '@/features/image/tools/compress-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-compress');

export const Route = createFileRoute('/image/compress')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <CompressTool />
    </ToolPage>
  ),
});
