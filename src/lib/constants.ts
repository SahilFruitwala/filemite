/** Max images in one batch (server stability). */
export const MAX_SERVER_IMAGES = 20;

/**
 * Vercel serverless request body limit is ~4.5MB.
 * Stay under that so uploads don't fail mysteriously on deploy.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES =
  'image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif';

export const LIMIT_REASONS = {
  SERVER: `Up to ${MAX_SERVER_IMAGES} images per batch, ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB each. Processed in-memory and never stored.`,
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
