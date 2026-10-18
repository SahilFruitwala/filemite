import { createFileRoute } from '@tanstack/react-router';
import { guardImageRequest } from '@/server/guard';
import { scrubImage, type ImageFormat } from '@/server/image';
import { captureServerEvent } from '@/server/posthog';
import { binaryResponse, processingError, readImageUpload } from '@/server/upload';

export const Route = createFileRoute('/api/image/scrub')({
  server: {
    handlers: {
      POST: ({ request }) =>
        guardImageRequest(request, { cost: 1 }, async () => {
          const upload = await readImageUpload(request);
          if (upload instanceof Response) return upload;
          const { file, buffer, format } = upload;

          const outputFormat: ImageFormat = format === 'heif' ? 'jpeg' : format;
          try {
            const scrubbed = await scrubImage(buffer, outputFormat);

            captureServerEvent('server_metadata_scrubbed', {
              file_format: format,
              original_size_bytes: buffer.byteLength,
              scrubbed_size_bytes: scrubbed.byteLength,
            });

            const extension = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
            const stem = file.name.replace(/\.[^.]+$/, '') || 'image';
            return binaryResponse(scrubbed, `image/${outputFormat}`, `${stem}-clean.${extension}`);
          } catch (error) {
            return processingError(error, 'Scrubbing');
          }
        }),
    },
  },
});
