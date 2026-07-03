import { createFileRoute } from '@tanstack/react-router';
import {
  capWidth,
  cropImage,
  decode,
  encode,
  resizeImage,
  sniffFormat,
  type ImageFormat,
  type ResizeFit,
} from '@/lib/image-wasm';
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

          const requestedFormat = formData.get('format') as string | null;
          const compressionLevel = (formData.get('level') as string) || 'mid';
          const speed = (formData.get('speed') as string) || 'normal';

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
            (finalWidth !== undefined && !isNaN(finalWidth)) ||
            (finalHeight !== undefined && !isNaN(finalHeight));

          const buffer = await file.arrayBuffer();
          const inputFormat = sniffFormat(buffer, file.type);
          if (!inputFormat) return jsonError('Unsupported image format', 415);

          let targetFormat = (requestedFormat || inputFormat).toLowerCase();
          if (targetFormat === 'jpg') targetFormat = 'jpeg';
          if (!['jpeg', 'png', 'webp'].includes(targetFormat)) {
            targetFormat = 'webp';
          }

          let image = await decode(buffer, inputFormat);

          if (shouldCrop) {
            image = cropImage(image, cropX!, cropY!, cropW!, cropH!);
          }

          if (shouldResize) {
            image = await resizeImage(image, finalWidth, finalHeight, resizeFit);
          } else if (image.width > MAX_WIDTH) {
            image = await capWidth(image, MAX_WIDTH);
          }

          let quality = 75;
          if (compressionLevel === 'best') quality = 90;
          if (compressionLevel === 'low') quality = 40;
          if (compressionLevel === 'lossless') quality = 100;

          const output = await encode(image, targetFormat as ImageFormat, {
            quality,
            lossless: compressionLevel === 'lossless',
            fast: speed === 'fast',
          });

          captureServerEvent('server_image_compressed', {
            input_format: inputFormat,
            output_format: targetFormat,
            compression_level: compressionLevel,
            original_size_bytes: buffer.byteLength,
            compressed_size_bytes: output.byteLength,
            reduction_percent: Math.round(
              ((buffer.byteLength - output.byteLength) / buffer.byteLength) * 100,
            ),
            did_resize: shouldResize,
            did_crop: shouldCrop,
          });

          return new Response(output, {
            status: 200,
            headers: {
              'Content-Type': `image/${targetFormat}`,
              'Content-Length': output.byteLength.toString(),
              'Content-Disposition': `attachment; filename="compressed.${targetFormat}"`,
              'Cache-Control': 'public, max-age=31536000, immutable',
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
