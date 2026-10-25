/**
 * Server image pipeline powered by Sharp (libvips).
 * Runs on Node serverless (Vercel) — not Edge/Workers.
 */
import sharp, { type FitEnum, type SharpOptions } from 'sharp';
import { MAX_INPUT_PIXELS } from '@/lib/limits';
import { pngsToIco } from '@/lib/ico';

// Each request decodes a fresh upload, so libvips' operation cache only costs memory.
sharp.cache(false);

/** Decoder options for untrusted input. */
const INPUT: SharpOptions = { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS };

/** Thrown for inputs we refuse to decode; maps to a 4xx response. */
export class ImageInputError extends Error {}

function load(input: Buffer, options: SharpOptions = {}) {
  return sharp(input, { ...INPUT, ...options });
}

/** Sharp reports pixel-limit and corrupt-file failures as plain Errors. */
export function toInputError(error: unknown): ImageInputError | null {
  const message = error instanceof Error ? error.message : '';
  if (/pixel limit/i.test(message)) {
    return new ImageInputError(
      `Image is too large to process (max ${Math.round(MAX_INPUT_PIXELS / 1e6)} megapixels).`,
    );
  }
  if (/unsupported image format|corrupt|bad seek|premature end/i.test(message)) {
    return new ImageInputError('This image looks damaged or uses an unsupported format.');
  }
  return null;
}

export type ImageFormat = 'jpeg' | 'png' | 'webp';
export type ResizeFit = 'cover' | 'contain' | 'inside' | 'fill';

const FIT_MAP: Record<ResizeFit, keyof FitEnum> = {
  cover: 'cover',
  contain: 'contain',
  inside: 'inside',
  fill: 'fill',
};

export function sniffFormat(
  buffer: ArrayBuffer | Buffer,
  mimeType?: string,
): ImageFormat | 'heif' | null {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer));
  if (bytes.length < 12) {
    const fromMime = mimeFromString(mimeType);
    return fromMime;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  // HEIC/HEIF: ftyp box with heic/heif/mif1 brands
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = bytes.subarray(8, 12).toString('ascii');
    if (['heic', 'heif', 'mif1', 'msf1', 'heix', 'hevc'].includes(brand)) {
      return 'heif';
    }
  }

  return mimeFromString(mimeType);
}

function mimeFromString(mimeType?: string): ImageFormat | 'heif' | null {
  const fromMime = mimeType?.split('/')[1]?.toLowerCase().replace('jpg', 'jpeg');
  if (fromMime === 'jpeg' || fromMime === 'png' || fromMime === 'webp') return fromMime;
  if (fromMime === 'heic' || fromMime === 'heif') return 'heif';
  return null;
}

export interface ProcessOptions {
  quality: number;
  lossless?: boolean;
  targetFormat: ImageFormat;
  maxWidth?: number;
  width?: number;
  height?: number;
  fit?: ResizeFit;
  crop?: { x: number; y: number; width: number; height: number };
}

export async function processImage(
  input: Buffer,
  {
    quality,
    lossless = false,
    targetFormat,
    maxWidth = 1920,
    width,
    height,
    fit = 'cover',
    crop,
  }: ProcessOptions,
): Promise<{ data: Buffer; format: ImageFormat; width: number; height: number }> {
  let pipeline = load(input, { animated: false }).rotate();

  if (crop) {
    // extract() runs after rotate(); use autoOrient dims (EXIF-aware).
    const meta = await pipeline.metadata();
    const srcW = meta.autoOrient.width ?? meta.width ?? 0;
    const srcH = meta.autoOrient.height ?? meta.height ?? 0;
    const left = Math.max(0, Math.min(crop.x, Math.max(0, srcW - 1)));
    const top = Math.max(0, Math.min(crop.y, Math.max(0, srcH - 1)));
    const w = Math.max(1, Math.min(crop.width, srcW - left));
    const h = Math.max(1, Math.min(crop.height, srcH - top));
    pipeline = pipeline.extract({ left, top, width: w, height: h });
  }

  const shouldResize =
    (width !== undefined && !Number.isNaN(width)) ||
    (height !== undefined && !Number.isNaN(height));

  if (shouldResize) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: FIT_MAP[fit],
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  } else if (maxWidth) {
    pipeline = pipeline.resize({
      width: maxWidth,
      withoutEnlargement: true,
    });
  }

  pipeline = encodeSharp(pipeline, targetFormat, quality, lossless);

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    data,
    format: targetFormat,
    width: info.width,
    height: info.height,
  };
}

function encodeSharp(
  pipeline: sharp.Sharp,
  format: ImageFormat,
  quality: number,
  lossless: boolean,
) {
  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({
        quality: lossless ? 100 : quality,
        mozjpeg: true,
      });
    case 'png':
      if (lossless || quality >= 100) {
        return pipeline.png({ compressionLevel: 9, palette: false });
      }
      // Lossy PNG via palette quantization (same idea as the old wasm path).
      return pipeline.png({
        compressionLevel: 9,
        palette: true,
        quality: 100,
        colours: Math.max(16, Math.floor((quality / 100) * 256)),
        dither: 1,
      });
    case 'webp':
      return pipeline.webp(lossless ? { lossless: true, quality: 100 } : { quality, effort: 4 });
  }
}

/** Re-encode in place to strip EXIF/XMP/ICC metadata. */
export async function scrubImage(input: Buffer, format: ImageFormat): Promise<Buffer> {
  let pipeline = load(input).rotate();
  pipeline = encodeSharp(pipeline, format, 100, format !== 'jpeg');
  return pipeline.toBuffer();
}

export async function getImageDimensions(
  input: Buffer,
): Promise<{ width?: number; height?: number; format?: string }> {
  const meta = await load(input).metadata();
  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
  };
}

export const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;
export const APPLE_TOUCH_SIZE = 180;
const ICO_SIZES = [16, 32, 48];

/**
 * Renders the full favicon set from one decode: PNGs at every size, the
 * Apple touch icon (opaque, as iOS requires) and a multi-size favicon.ico.
 */
export async function generateFavicons(input: Buffer): Promise<Record<string, Uint8Array>> {
  // Normalise once (orientation, square canvas) so every size starts from the same source.
  const base = await load(input, { animated: false })
    .rotate()
    .resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const render = (size: number) =>
    sharp(base).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

  const pngs = await Promise.all(FAVICON_SIZES.map(render));
  const files: Record<string, Uint8Array> = {};
  FAVICON_SIZES.forEach((size, index) => {
    files[`favicon-${size}x${size}.png`] = pngs[index];
  });

  files['apple-touch-icon.png'] = await sharp(base)
    .resize(APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE)
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  files['favicon.ico'] = pngsToIco(
    ICO_SIZES.map((size) => pngs[FAVICON_SIZES.indexOf(size as (typeof FAVICON_SIZES)[number])]),
  );
  return files;
}
