import { createFileRoute } from '@tanstack/react-router';
import exifr from 'exifr';
import { decode, encode, sniffFormat } from '@/lib/image-wasm';
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

          const action = new URL(request.url).searchParams.get('action');
          const buffer = await file.arrayBuffer();
          const format = sniffFormat(buffer, file.type);

          if (action === 'view') {
            let metadata: Record<string, unknown> = {};
            try {
              metadata = (await exifr.parse(buffer, true)) ?? {};
            } catch {
              // no parseable metadata is a valid result
            }
            return json({
              metadata: {
                format,
                width: undefined,
                height: undefined,
                ...metadata,
              },
            });
          }

          if (action === 'scrub') {
            if (!format) return json({ error: 'Unsupported image format' }, 415);

            // Decoding to raw pixels and re-encoding drops every metadata block.
            const image = await decode(buffer, format);
            const scrubbed = await encode(image, format, {
              quality: 100,
              lossless: format !== 'jpeg',
            });

            captureServerEvent('server_metadata_scrubbed', {
              file_format: format,
              original_size_bytes: buffer.byteLength,
              scrubbed_size_bytes: scrubbed.byteLength,
            });

            return new Response(scrubbed, {
              headers: {
                'Content-Type': file.type || `image/${format}`,
                'Content-Disposition': `attachment; filename="scrubbed-${file.name}"`,
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
