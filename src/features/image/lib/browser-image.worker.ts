/// <reference lib="webworker" />
/**
 * Browser version of the Sharp pipeline in src/server/image.ts, for visitors
 * who pick on-device processing (and for files too big to upload). Decodes
 * with createImageBitmap, draws on an OffscreenCanvas and encodes JPEG with
 * mozjpeg; PNG and WebP use the browser's own encoders.
 */
import createMozJpeg from '@jsquash/jpeg/codec/enc/mozjpeg_enc.js';
import { defaultOptions } from '@jsquash/jpeg/meta.js';
import { zipSync } from 'fflate';

import { pngsToIco } from '@/lib/ico';
import { MAX_INPUT_PIXELS } from '@/lib/limits';
import { planResize } from './resize-plan';
import type { BrowserImageJob, BrowserImageReply, ImageFormat } from './browser-image';

/** Same numbers and longest edge as /api/image/compress. */
const QUALITY = { best: 90, mid: 75, low: 40, lossless: 100 } as const;
const MAX_WIDTH = 1920;

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256];
const APPLE_TOUCH_SIZE = 180;
const ICO_SIZES = [16, 32, 48];

type MozJpeg = {
  encode(data: BufferSource, width: number, height: number, options: typeof defaultOptions): Uint8Array;
};

let mozjpeg: Promise<MozJpeg | null> | null = null;

/** Loaded on first JPEG; if the WASM can't load, the browser's encoder is used instead. */
function loadMozJpeg() {
  mozjpeg ??= (createMozJpeg({ noInitialRun: true }) as Promise<MozJpeg>).catch(() => null);
  return mozjpeg;
}

async function decode(file: Blob) {
  let bitmap: ImageBitmap;
  try {
    // Applies EXIF orientation, like Sharp's rotate().
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Your browser couldn’t open this image. Try server processing instead.');
  }
  if (bitmap.width * bitmap.height > MAX_INPUT_PIXELS) {
    bitmap.close();
    throw new Error(
      `Image is too large to process (max ${Math.round(MAX_INPUT_PIXELS / 1e6)} megapixels).`,
    );
  }
  return bitmap;
}

function canvas(width: number, height: number, background?: string) {
  const surface = new OffscreenCanvas(width, height);
  const context = surface.getContext('2d');
  if (!context) throw new Error('Your browser couldn’t create a drawing surface.');
  context.imageSmoothingQuality = 'high';
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  return { surface, context };
}

/**
 * Draws `source` at `size`×`size`, halving in steps on the way down: a single
 * large downscale skips pixels and leaves small icons jagged.
 */
function scaleSquare(source: OffscreenCanvas, size: number, background?: string) {
  let current = source;
  while (current.width / 2 >= size * 1.5) {
    const half = Math.round(current.width / 2);
    const step = canvas(half, half);
    step.context.drawImage(current, 0, 0, half, half);
    current = step.surface;
  }
  const out = canvas(size, size, background);
  out.context.drawImage(current, 0, 0, size, size);
  return out.surface;
}

async function encode(
  surface: OffscreenCanvas,
  format: ImageFormat,
  quality: number,
  lossless: boolean,
): Promise<Blob> {
  if (format === 'jpeg') {
    const encoder = await loadMozJpeg();
    if (encoder) {
      const { data } = surface
        .getContext('2d')!
        .getImageData(0, 0, surface.width, surface.height);
      const bytes = encoder.encode(data, surface.width, surface.height, {
        ...defaultOptions,
        quality: lossless ? 100 : quality,
      });
      return new Blob([bytes.slice()], { type: 'image/jpeg' });
    }
  }
  const type = `image/${format}`;
  const blob = await surface.convertToBlob({
    type,
    // PNG ignores quality. Canvas WebP has no true lossless mode; 1 is the closest.
    quality: lossless ? 1 : quality / 100,
  });
  // Browsers that can't encode a type (Safari and WebP) quietly return PNG.
  if (blob.type !== type) {
    throw new Error(
      `Your browser can’t save ${format === 'jpeg' ? 'JPEG' : format.toUpperCase()} files. Pick another format or use server processing.`,
    );
  }
  return blob;
}

/** Keeps PNG, JPEG and WebP; anything else (GIF, AVIF) becomes PNG, as the server turns HEIC into JPEG. */
function formatFor(file: Blob): ImageFormat {
  if (file.type === 'image/jpeg' || /hei[cf]/.test(file.type)) return 'jpeg';
  if (file.type === 'image/webp') return 'webp';
  return 'png';
}

async function processImage(job: Extract<BrowserImageJob, { kind: 'process' }>) {
  const { file, level, width, height, fit, keepSize } = job;
  const format = job.format ?? formatFor(file);
  const bitmap = await decode(file);
  try {
    const resize = width !== undefined || height !== undefined;
    const plan = planResize(bitmap.width, bitmap.height, {
      width,
      height,
      fit,
      maxWidth: keepSize || resize ? 0 : MAX_WIDTH,
    });
    // JPEG has no transparency: paint white so it doesn't turn black.
    const { surface, context } = canvas(plan.width, plan.height, format === 'jpeg' ? '#fff' : undefined);
    const { source: s, target: t } = plan;
    context.drawImage(bitmap, s.x, s.y, s.width, s.height, t.x, t.y, t.width, t.height);
    return await encode(surface, format, QUALITY[level], level === 'lossless');
  } finally {
    bitmap.close();
  }
}

/** Re-encodes the pixels at full size; nothing from the original file's metadata is copied. */
async function scrubImage(file: Blob) {
  const format = formatFor(file);
  const bitmap = await decode(file);
  try {
    const { surface, context } = canvas(bitmap.width, bitmap.height, format === 'jpeg' ? '#fff' : undefined);
    context.drawImage(bitmap, 0, 0);
    return await encode(surface, format, 100, format !== 'jpeg');
  } finally {
    bitmap.close();
  }
}

const pngBytes = async (surface: OffscreenCanvas) =>
  new Uint8Array(await (await surface.convertToBlob({ type: 'image/png' })).arrayBuffer());

/** Same set as the server: PNGs at every size, an opaque Apple touch icon and a multi-size .ico. */
async function generateFavicons(file: Blob) {
  const bitmap = await decode(file);
  const base = canvas(512, 512);
  try {
    // Centre on a transparent square, like Sharp's fit: 'contain'.
    const plan = planResize(bitmap.width, bitmap.height, { width: 512, height: 512, fit: 'contain' });
    const t = plan.target;
    base.context.drawImage(bitmap, t.x, t.y, t.width, t.height);
  } finally {
    bitmap.close();
  }

  const files: Record<string, Uint8Array> = {};
  const pngs = await Promise.all(FAVICON_SIZES.map((size) => pngBytes(scaleSquare(base.surface, size))));
  FAVICON_SIZES.forEach((size, index) => {
    files[`favicon-${size}x${size}.png`] = pngs[index];
  });
  files['apple-touch-icon.png'] = await pngBytes(
    scaleSquare(base.surface, APPLE_TOUCH_SIZE, '#fff'),
  );
  files['favicon.ico'] = pngsToIco(ICO_SIZES.map((size) => pngs[FAVICON_SIZES.indexOf(size)]));

  // PNG and ICO are already compressed — store them as-is.
  const zip = zipSync(files, { level: 0 });
  return new Blob([zip], { type: 'application/zip' });
}

function run(job: BrowserImageJob): Promise<Blob> {
  switch (job.kind) {
    case 'process':
      return processImage(job);
    case 'scrub':
      return scrubImage(job.file);
    case 'favicons':
      return generateFavicons(job.file);
  }
}

self.onmessage = async ({ data }: MessageEvent<{ id: number; job: BrowserImageJob }>) => {
  let reply: BrowserImageReply;
  try {
    reply = { id: data.id, ok: true, blob: await run(data.job) };
  } catch (error) {
    reply = {
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
  self.postMessage(reply);
};
