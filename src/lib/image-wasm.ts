/**
 * WebAssembly image pipeline (jSquash/Squoosh codecs).
 * Replaces sharp so server routes run on Cloudflare Workers and Node alike.
 */
import decodeJpeg, { init as initJpegDec } from '@jsquash/jpeg/decode.js';
import encodeJpeg, { init as initJpegEnc } from '@jsquash/jpeg/encode.js';
import decodePng, { init as initPngDec } from '@jsquash/png/decode.js';
import encodePng, { init as initPngEnc } from '@jsquash/png/encode.js';
import optimisePng, { init as initOxipng } from '@jsquash/oxipng/optimise.js';
import decodeWebp, { init as initWebpDec } from '@jsquash/webp/decode.js';
import encodeWebp, { init as initWebpEnc } from '@jsquash/webp/encode.js';
import decodeAvif, { init as initAvifDec } from '@jsquash/avif/decode.js';
import encodeAvif, { init as initAvifEnc } from '@jsquash/avif/encode.js';
import resize, { initResize } from '@jsquash/resize';
import { png as icodecPng } from 'icodec';

import JPEG_DEC_WASM from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm';
import JPEG_ENC_WASM from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm';
// @ts-expect-error wasm-bindgen's d.ts has no default export; the bundler provides a WebAssembly.Module
import PNG_WASM from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm';
// @ts-expect-error see above
import OXIPNG_WASM from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm';
import WEBP_DEC_WASM from '@jsquash/webp/codec/dec/webp_dec.wasm';
import WEBP_ENC_WASM from '@jsquash/webp/codec/enc/webp_enc.wasm';
import AVIF_DEC_WASM from '@jsquash/avif/codec/dec/avif_dec.wasm';
import AVIF_ENC_WASM from '@jsquash/avif/codec/enc/avif_enc.wasm';
// @ts-expect-error see above
import RESIZE_WASM from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm';
import PNGQUANT_WASM from 'icodec/png-enc.wasm';

// workerd has no ImageData global; jSquash constructs them.
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    readonly colorSpace = 'srgb' as const;
    constructor(data: Uint8ClampedArray, width: number, height?: number) {
      this.data = data;
      this.width = width;
      this.height = height ?? data.length / 4 / width;
    }
  }
  (globalThis as Record<string, unknown>).ImageData = ImageDataPolyfill;
}

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

const initOnce: Record<string, Promise<unknown> | undefined> = {};
function once(key: string, fn: () => Promise<unknown>) {
  initOnce[key] ??= fn();
  return initOnce[key]!;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- jSquash init() typings omit the WebAssembly.Module overload */
const ready = {
  jpegDec: () => once('jpegDec', () => (initJpegDec as any)(JPEG_DEC_WASM)),
  jpegEnc: () => once('jpegEnc', () => (initJpegEnc as any)(JPEG_ENC_WASM)),
  pngDec: () => once('pngDec', () => (initPngDec as any)(PNG_WASM)),
  pngEnc: () => once('pngEnc', () => (initPngEnc as any)(PNG_WASM)),
  oxipng: () => once('oxipng', () => (initOxipng as any)(OXIPNG_WASM)),
  webpDec: () => once('webpDec', () => (initWebpDec as any)(WEBP_DEC_WASM)),
  webpEnc: () => once('webpEnc', () => (initWebpEnc as any)(WEBP_ENC_WASM)),
  avifDec: () => once('avifDec', () => (initAvifDec as any)(AVIF_DEC_WASM)),
  avifEnc: () => once('avifEnc', () => (initAvifEnc as any)(AVIF_ENC_WASM)),
  resize: () => once('resize', () => Promise.resolve(initResize(RESIZE_WASM as any))),
  pngquant: () => once('pngquant', () => icodecPng.loadEncoder(PNGQUANT_WASM as any)),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function sniffFormat(buffer: ArrayBuffer, mimeType?: string): ImageFormat | null {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp';
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'avif';
  const fromMime = mimeType?.split('/')[1]?.replace('jpg', 'jpeg');
  if (fromMime === 'jpeg' || fromMime === 'png' || fromMime === 'webp' || fromMime === 'avif') {
    return fromMime;
  }
  return null;
}

export async function decode(buffer: ArrayBuffer, format: ImageFormat): Promise<ImageData> {
  switch (format) {
    case 'jpeg':
      await ready.jpegDec();
      return decodeJpeg(buffer);
    case 'png':
      await ready.pngDec();
      return decodePng(buffer);
    case 'webp':
      await ready.webpDec();
      return decodeWebp(buffer);
    case 'avif': {
      await ready.avifDec();
      const image = await decodeAvif(buffer);
      if (!image) throw new Error('AVIF decode failed');
      return image;
    }
  }
}

export interface EncodeOptions {
  /** 0-100; 100 or `lossless` selects the lossless path where the format has one. */
  quality: number;
  lossless?: boolean;
  /** `fast` trades size for speed. */
  fast?: boolean;
}

export async function encode(
  image: ImageData,
  format: ImageFormat,
  { quality, lossless = false, fast = false }: EncodeOptions,
): Promise<ArrayBuffer> {
  switch (format) {
    case 'jpeg': {
      await ready.jpegEnc();
      return encodeJpeg(image, { quality: lossless ? 100 : quality });
    }
    case 'png': {
      if (lossless || quality >= 100) {
        await ready.pngEnc();
        const png = await encodePng(image);
        if (fast) return png;
        await ready.oxipng();
        return optimisePng(png, { level: 4 });
      }
      // Lossy PNG: imagequant palette quantization + oxipng (pngquant-style).
      // Keep imagequant's quality at 100 and control loss through palette size,
      // like sharp's colors = quality/100*256 — a lower ceiling merges distinct
      // colors and visibly shifts flat-color images.
      await ready.pngquant();
      const out = icodecPng.encode({ data: image.data, width: image.width, height: image.height, depth: 8 }, {
        quantize: true,
        quality: 100,
        colors: Math.max(16, Math.floor((quality / 100) * 256)),
        speed: fast ? 8 : 4,
        dithering: 1,
        level: fast ? 1 : 3,
      });
      return out.byteOffset === 0 && out.byteLength === out.buffer.byteLength
        ? (out.buffer as ArrayBuffer)
        : (out.slice().buffer as ArrayBuffer);
    }
    case 'webp': {
      await ready.webpEnc();
      return encodeWebp(
        image,
        lossless
          ? { lossless: 1, quality: 100 }
          : { quality, method: fast ? 0 : 4 },
      );
    }
    case 'avif': {
      await ready.avifEnc();
      return encodeAvif(image, {
        quality: lossless ? 90 : Math.min(quality, 85),
        speed: fast ? 9 : 6,
      });
    }
  }
}

export function cropImage(image: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const sx = Math.max(0, Math.min(x, image.width - 1));
  const sy = Math.max(0, Math.min(y, image.height - 1));
  const sw = Math.max(1, Math.min(w, image.width - sx));
  const sh = Math.max(1, Math.min(h, image.height - sy));
  const out = new Uint8ClampedArray(sw * sh * 4);
  for (let row = 0; row < sh; row++) {
    const src = ((sy + row) * image.width + sx) * 4;
    out.set(image.data.subarray(src, src + sw * 4), row * sw * 4);
  }
  return new ImageData(out, sw, sh);
}

export type ResizeFit = 'cover' | 'contain' | 'inside' | 'fill';

export async function resizeImage(
  image: ImageData,
  targetWidth: number | undefined,
  targetHeight: number | undefined,
  fit: ResizeFit,
): Promise<ImageData> {
  await ready.resize();

  const srcW = image.width;
  const srcH = image.height;
  const aspect = srcW / srcH;
  const width = targetWidth ?? Math.round((targetHeight ?? srcH) * aspect);
  const height = targetHeight ?? Math.round(width / aspect);

  if (fit === 'fill' || (targetWidth === undefined || targetHeight === undefined)) {
    return resize(image, { width, height, fitMethod: 'stretch', method: 'lanczos3', linearRGB: false });
  }

  if (fit === 'cover') {
    // jSquash "contain" crops to the target aspect ratio before scaling — CSS cover.
    return resize(image, { width, height, fitMethod: 'contain', method: 'lanczos3', linearRGB: false });
  }

  // inside/contain: scale to fit within the box, preserving aspect (may enlarge,
  // matching sharp's withoutEnlargement: false)
  const scale = Math.min(width / srcW, height / srcH);
  const innerW = Math.max(1, Math.round(srcW * scale));
  const innerH = Math.max(1, Math.round(srcH * scale));
  const scaled =
    innerW === srcW && innerH === srcH
      ? image
      : await resize(image, { width: innerW, height: innerH, fitMethod: 'stretch', method: 'lanczos3', linearRGB: false });

  if (fit === 'inside') return scaled;

  // contain: letterbox onto a transparent canvas of the exact target size
  const canvas = new Uint8ClampedArray(width * height * 4);
  const offsetX = Math.floor((width - innerW) / 2);
  const offsetY = Math.floor((height - innerH) / 2);
  for (let row = 0; row < innerH; row++) {
    const dst = ((offsetY + row) * width + offsetX) * 4;
    canvas.set(scaled.data.subarray(row * innerW * 4, (row + 1) * innerW * 4), dst);
  }
  return new ImageData(canvas, width, height);
}

/** Scale down so width does not exceed `maxWidth`, preserving aspect. */
export async function capWidth(image: ImageData, maxWidth: number): Promise<ImageData> {
  if (image.width <= maxWidth) return image;
  const height = Math.round((maxWidth / image.width) * image.height);
  await ready.resize();
  return resize(image, { width: maxWidth, height, fitMethod: 'stretch', method: 'lanczos3', linearRGB: false });
}
