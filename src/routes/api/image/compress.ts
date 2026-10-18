import { createFileRoute } from '@tanstack/react-router';
import { MAX_OUTPUT_DIMENSION } from '@/lib/limits';
import { guardImageRequest, jsonError } from '@/server/guard';
import { processImage, type ImageFormat, type ResizeFit } from '@/server/image';
import { captureServerEvent } from '@/server/posthog';
import { binaryResponse, intField, processingError, readImageUpload } from '@/server/upload';

/** Longest edge for plain compression (no explicit resize). */
const MAX_WIDTH = 1920;

const QUALITY: Record<string, number> = { best: 90, mid: 75, low: 40, lossless: 100 };
const FITS: ResizeFit[] = ['cover', 'contain', 'inside', 'fill'];
const FORMATS: ImageFormat[] = ['jpeg', 'png', 'webp'];

export const Route = createFileRoute('/api/image/compress')({
  server: {
    handlers: {
      POST: ({ request }) =>
        guardImageRequest(request, { cost: 1 }, async () => {
          const upload = await readImageUpload(request);
          if (upload instanceof Response) return upload;
          const { form, buffer, format: inputFormat } = upload;

          const level = String(form.get('level') ?? 'mid');
          const quality = QUALITY[level];
          if (quality === undefined) return jsonError('Unknown compression level.', 400);

          const requested = String(form.get('format') ?? '')
            .toLowerCase()
            .replace('jpg', 'jpeg');
          const targetFormat: ImageFormat = FORMATS.includes(requested as ImageFormat)
            ? (requested as ImageFormat)
            : inputFormat === 'heif'
              ? 'jpeg'
              : inputFormat;

          const fit = String(form.get('fit') ?? 'cover') as ResizeFit;
          if (!FITS.includes(fit)) return jsonError('Unknown resize mode.', 400);

          const width = intField(form, 'width', MAX_OUTPUT_DIMENSION);
          const height = intField(form, 'height', MAX_OUTPUT_DIMENSION);
          if (width === null || height === null || width === 0 || height === 0) {
            return jsonError(
              `Width and height must be between 1 and ${MAX_OUTPUT_DIMENSION}px.`,
              400,
            );
          }

          const cropFields = ['cropX', 'cropY', 'cropW', 'cropH'].map((name) =>
            intField(form, name, 100_000),
          );
          if (cropFields.includes(null)) return jsonError('Invalid crop area.', 400);
          const [cropX, cropY, cropW, cropH] = cropFields as (number | undefined)[];
          const crop =
            cropX !== undefined && cropY !== undefined && cropW && cropH
              ? { x: cropX, y: cropY, width: cropW, height: cropH }
              : undefined;

          const shouldResize = width !== undefined || height !== undefined;

          try {
            const output = await processImage(buffer, {
              quality,
              lossless: level === 'lossless',
              targetFormat,
              maxWidth: shouldResize ? undefined : MAX_WIDTH,
              width,
              height,
              fit,
              crop,
            });

            captureServerEvent('server_image_compressed', {
              input_format: inputFormat,
              output_format: output.format,
              compression_level: level,
              original_size_bytes: buffer.byteLength,
              compressed_size_bytes: output.data.byteLength,
              reduction_percent: Math.round(
                ((buffer.byteLength - output.data.byteLength) / buffer.byteLength) * 100,
              ),
              did_resize: shouldResize,
              did_crop: !!crop,
            });

            return binaryResponse(
              output.data,
              `image/${output.format}`,
              `compressed.${output.format === 'jpeg' ? 'jpg' : output.format}`,
            );
          } catch (error) {
            return processingError(error, 'Compression');
          }
        }),
    },
  },
});
