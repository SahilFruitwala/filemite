import { createFileRoute } from '@tanstack/react-router';
import { zipSync } from 'fflate';
import { guardImageRequest } from '@/server/guard';
import { generateFavicons } from '@/server/image';
import { captureServerEvent } from '@/server/posthog';
import { binaryResponse, processingError, readImageUpload } from '@/server/upload';

export const Route = createFileRoute('/api/image/favicon')({
  server: {
    handlers: {
      // One request renders the whole set, so it costs a few tokens.
      POST: ({ request }) =>
        guardImageRequest(request, { cost: 3 }, async () => {
          const upload = await readImageUpload(request);
          if (upload instanceof Response) return upload;

          try {
            const files = await generateFavicons(upload.buffer);
            // PNG and ICO are already compressed — store them as-is.
            const zip = zipSync(files, { level: 0 });
            captureServerEvent('server_favicons_generated', {
              original_size_bytes: upload.buffer.byteLength,
            });
            return binaryResponse(zip, 'application/zip', 'favicons.zip');
          } catch (error) {
            return processingError(error, 'Favicon generation');
          }
        }),
    },
  },
});
