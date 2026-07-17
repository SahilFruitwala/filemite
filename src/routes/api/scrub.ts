import { createFileRoute } from '@tanstack/react-router';
import exifr from 'exifr';
import {
  getImageDimensions,
  scrubImage,
  sniffFormat,
  type ImageFormat,
} from '@/lib/image';
import { MAX_FILE_BYTES } from '@/lib/constants';
import { captureServerEvent } from '@/lib/posthog-server';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const Route = createFileRoute('/api/scrub')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get('file');
          if (!(file instanceof File)) return json({ error: 'No file provided' }, 400);

          if (file.size > MAX_FILE_BYTES) {
            return json(
              {
                error: `File too large. Max size is ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB.`,
              },
              413,
            );
          }

          const action = new URL(request.url).searchParams.get('action');
          const buffer = Buffer.from(await file.arrayBuffer());
          const format = sniffFormat(buffer, file.type);

          if (action === 'view') {
            let metadata: Record<string, unknown> = {};
            try {
              metadata = (await exifr.parse(buffer, true)) ?? {};
            } catch {
              // no parseable metadata is a valid result
            }
            const dims = await getImageDimensions(buffer).catch(() => ({}));
            return json({
              metadata: {
                format: format === 'heif' ? 'heic' : format,
                ...dims,
                ...metadata,
              },
            });
          }

          if (action === 'scrub') {
            if (!format) return json({ error: 'Unsupported image format' }, 415);

            const outputFormat: ImageFormat =
              format === 'heif' ? 'jpeg' : format;

            const scrubbed = await scrubImage(buffer, outputFormat);

            captureServerEvent('server_metadata_scrubbed', {
              file_format: format,
              original_size_bytes: buffer.byteLength,
              scrubbed_size_bytes: scrubbed.byteLength,
            });

            return new Response(new Uint8Array(scrubbed), {
              headers: {
                'Content-Type': `image/${outputFormat}`,
                'Content-Disposition': `attachment; filename="scrubbed-${file.name.replace(/\.[^.]+$/, '')}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}"`,
                'Cache-Control': 'no-store',
              },
            });
          }

          return json({ error: 'Invalid action' }, 400);
        } catch (error) {
          console.error('Scrub error:', error);
          return json({ error: 'Failed to process image' }, 500);
        }
      },
    },
  },
});
