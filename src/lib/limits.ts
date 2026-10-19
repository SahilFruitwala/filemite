/**
 * Limits shared by the browser and the server, so the UI can reject work
 * before uploading it and the server enforces the same numbers.
 */

/** Vercel's serverless body limit is ~4.5 MB; stay under it. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Images over MAX_IMAGE_BYTES are compressed in the browser instead of
 * uploaded; this only protects the tab's memory.
 */
export const MAX_BROWSER_IMAGE_BYTES = 100 * 1024 * 1024;

/** Images one visitor can queue in a batch. */
export const MAX_IMAGE_BATCH = 10;

/** Largest width or height the resize endpoint will produce. */
export const MAX_OUTPUT_DIMENSION = 8192;

/** Decoded pixels allowed per input image — guards against decompression bombs. */
export const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Images one visitor can have processing at once. The browser uploads this
 * many at a time and the server rejects more, so a single visitor can never
 * occupy every processing slot.
 */
export const IMAGE_UPLOAD_CONCURRENCY = 2;

/** Images one visitor can process per hour across all image tools. */
export const IMAGES_PER_HOUR = 100;

/** PDFs never leave the browser; these only protect the tab's memory. */
export const MAX_PDF_BYTES = 250 * 1024 * 1024;
export const MAX_PDF_FILES = 20;

export const ACCEPTED_IMAGE_TYPES =
  'image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif';
