import { createFileRoute } from '@tanstack/react-router';

import { ToolPage } from '@/components/tool/tool-page';
import { RedactTool } from '@/features/image/tools/redact-tool';
import { toolHead } from '@/lib/seo';
import { getTool } from '@/lib/tools';

const tool = getTool('image-redact');

export const Route = createFileRoute('/image/redact')({
  head: () => toolHead(tool),
  component: () => (
    <ToolPage tool={tool}>
      <RedactTool />
    </ToolPage>
  ),
});
