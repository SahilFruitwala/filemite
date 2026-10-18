/**
 * Limits shared by the browser and the server, so the UI can reject work
 * before uploading it and the server enforces the same numbers.
 */

/** Vercel's serverless body limit is ~4.5 MB; stay under it. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Images per compress batch. */
export const MAX_IMAGE_BATCH = 20;

/** Largest width or height the resize endpoint will produce. */
export const MAX_OUTPUT_DIMENSION = 8192;

/** Decoded pixels allowed per input image — guards against decompression bombs. */
export const MAX_INPUT_PIXELS = 50_000_000;

/** Image uploads the browser runs at once (the server allows a few more per IP). */
export const IMAGE_UPLOAD_CONCURRENCY = 2;

/** PDFs never leave the browser; this only protects the tab's memory. */
export const MAX_PDF_BYTES = 250 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES =
  'image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif';
