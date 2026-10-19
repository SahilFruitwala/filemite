import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { AnnotateImageTool } from '@/features/image/tools/annotate-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-annotate');

export const Route = createFileRoute('/image/annotate')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <AnnotateImageTool />
    </ToolPage>
  ),
});
