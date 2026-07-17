import { createFileRoute } from '@tanstack/react-router';
import {
  processImage,
  sniffFormat,
  type ImageFormat,
  type ResizeFit,
} from '@/lib/image';
import { MAX_FILE_BYTES } from '@/lib/constants';
import { captureServerEvent } from '@/lib/posthog-server';

const MAX_WIDTH = 1920;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const Route = createFileRoute('/api/compress')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get('file');
          if (!(file instanceof File)) return jsonError('No file provided', 400);

          if (file.size > MAX_FILE_BYTES) {
            return jsonError(
              `File too large. Max size is ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB.`,
              413,
            );
          }

          const requestedFormat = formData.get('format') as string | null;
          const compressionLevel = (formData.get('level') as string) || 'mid';

          const widthRaw = formData.get('width');
          const heightRaw = formData.get('height');
          const resizeFit = ((formData.get('fit') as string) || 'cover') as ResizeFit;

          const cropX = formData.get('cropX') ? parseInt(formData.get('cropX') as string) : null;
          const cropY = formData.get('cropY') ? parseInt(formData.get('cropY') as string) : null;
          const cropW = formData.get('cropW') ? parseInt(formData.get('cropW') as string) : null;
          const cropH = formData.get('cropH') ? parseInt(formData.get('cropH') as string) : null;

          const finalWidth = widthRaw ? parseInt(widthRaw as string) : undefined;
          const finalHeight = heightRaw ? parseInt(heightRaw as string) : undefined;

          const shouldCrop =
            cropW !== null && cropH !== null && cropX !== null && cropY !== null;
          const shouldResize =
            (finalWidth !== undefined && !Number.isNaN(finalWidth)) ||
            (finalHeight !== undefined && !Number.isNaN(finalHeight));

          const buffer = Buffer.from(await file.arrayBuffer());
          const inputFormat = sniffFormat(buffer, file.type);
          if (!inputFormat) return jsonError('Unsupported image format', 415);

          let targetFormat = (requestedFormat || (inputFormat === 'heif' ? 'jpeg' : inputFormat)).toLowerCase();
          if (targetFormat === 'jpg') targetFormat = 'jpeg';
          if (!['jpeg', 'png', 'webp'].includes(targetFormat)) {
            targetFormat = 'webp';
          }

          let quality = 75;
          if (compressionLevel === 'best') quality = 90;
          if (compressionLevel === 'low') quality = 40;
          if (compressionLevel === 'lossless') quality = 100;

          const output = await processImage(buffer, {
            quality,
            lossless: compressionLevel === 'lossless',
            targetFormat: targetFormat as ImageFormat,
            maxWidth: shouldResize ? undefined : MAX_WIDTH,
            width: shouldResize ? finalWidth : undefined,
            height: shouldResize ? finalHeight : undefined,
            fit: resizeFit,
            crop: shouldCrop
              ? { x: cropX!, y: cropY!, width: cropW!, height: cropH! }
              : undefined,
          });

          captureServerEvent('server_image_compressed', {
            input_format: inputFormat,
            output_format: output.format,
            compression_level: compressionLevel,
            original_size_bytes: buffer.byteLength,
            compressed_size_bytes: output.data.byteLength,
            reduction_percent: Math.round(
              ((buffer.byteLength - output.data.byteLength) / buffer.byteLength) * 100,
            ),
            did_resize: shouldResize,
            did_crop: shouldCrop,
          });

          return new Response(new Uint8Array(output.data), {
            status: 200,
            headers: {
              'Content-Type': `image/${output.format}`,
              'Content-Length': output.data.byteLength.toString(),
              'Content-Disposition': `attachment; filename="compressed.${output.format}"`,
              'Cache-Control': 'no-store',
            },
          });
        } catch (error) {
          console.error('Compression error:', error);
          return jsonError('Compression failed', 500);
        }
      },
    },
  },
});
