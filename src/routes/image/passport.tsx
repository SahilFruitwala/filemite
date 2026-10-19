import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { PassportTool } from '@/features/image/tools/passport-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-passport');

export const Route = createFileRoute('/image/passport')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <PassportTool />
    </ToolPage>
  ),
});
