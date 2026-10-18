import { MAX_IMAGE_BYTES } from '@/lib/limits';
import { jsonError } from './guard';
import { ImageInputError, sniffFormat, toInputError, type ImageFormat } from './image';

export type ImageUpload = {
  form: FormData;
  file: File;
  buffer: Buffer;
  format: ImageFormat | 'heif';
};

/** Parses a multipart upload with a single `file` field; returns a Response on bad input. */
export async function readImageUpload(request: Request): Promise<ImageUpload | Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Expected a multipart form upload.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('No file provided.', 400);
  if (file.size > MAX_IMAGE_BYTES) {
    return jsonError(
      `File too large. Max size is ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
      413,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = sniffFormat(buffer, file.type);
  if (!format) return jsonError('Unsupported image format. Use PNG, JPEG, WebP or HEIC.', 415);

  return { form, file, buffer, format };
}

/** Converts processing failures into a 4xx for bad input or a generic 500. */
export function processingError(error: unknown, label: string): Response {
  const inputError = error instanceof ImageInputError ? error : toInputError(error);
  if (inputError) return jsonError(inputError.message, 422);
  console.error(`${label} error:`, error);
  return jsonError(`${label} failed. Please try again.`, 500);
}

/** Parses an optional positive integer form field, clamped to `max`. */
export function intField(form: FormData, name: string, max: number): number | undefined | null {
  const raw = form.get(name);
  if (raw === null || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) return null;
  return value;
}

export function binaryResponse(data: Uint8Array, contentType: string, filename: string) {
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(data.byteLength),
      'Content-Disposition': `attachment; filename="${filename.replace(/["\\\r\n]/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
