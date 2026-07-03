/**
 * WebAssembly image pipeline (jSquash/Squoosh codecs).
 * Replaces sharp so server routes run on any host (Vercel, Netlify, Node, etc.).
 */
import decodeJpeg, { init as initJpegDec } from '@jsquash/jpeg/decode.js';
import encodeJpeg, { init as initJpegEnc } from '@jsquash/jpeg/encode.js';
import decodePng, { init as initPngDec } from '@jsquash/png/decode.js';
import encodePng, { init as initPngEnc } from '@jsquash/png/encode.js';
import optimisePng, { init as initOxipng } from '@jsquash/oxipng/optimise.js';
import decodeWebp, { init as initWebpDec } from '@jsquash/webp/decode.js';
import encodeWebp, { init as initWebpEnc } from '@jsquash/webp/encode.js';
import resize, { initResize } from '@jsquash/resize';
import { png as icodecPng } from 'icodec';

// The `.wasm` codecs are inlined as base64 (see the `wasm-base64` plugin in
// vite.config.ts) and compiled to a `WebAssembly.Module` at runtime. Baking the
// bytes into the server bundle keeps it self-contained and portable to any host
// (Vercel, Netlify, Cloudflare, bare Node) — unlike bare `.wasm` default
// imports, which only resolve under runtime-specific bundlers like Cloudflare's
// vite plugin, and unlike `?url`, whose emitted assets aren't copied for
// server-only code. jSquash/icodec `init()` all accept a Module.
import JPEG_DEC_WASM from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?base64';
import JPEG_ENC_WASM from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?base64';
import PNG_WASM from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm?base64';
import OXIPNG_WASM from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?base64';
import WEBP_DEC_WASM from '@jsquash/webp/codec/dec/webp_dec.wasm?base64';
import WEBP_ENC_WASM from '@jsquash/webp/codec/enc/webp_enc.wasm?base64';
import RESIZE_WASM from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm?base64';
import PNGQUANT_WASM from 'icodec/png-enc.wasm?base64';

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

// AVIF is intentionally omitted: its codec wasm (avif_enc ~3.4MB) dominated the
// server bundle and pushed the Cloudflare Worker past the 3 MiB free-tier limit.
export type ImageFormat = 'jpeg' | 'png' | 'webp';

const initOnce: Record<string, Promise<unknown> | undefined> = {};
function once(key: string, fn: () => Promise<unknown>) {
  initOnce[key] ??= fn();
  return initOnce[key]!;
}

/**
 * Compile a base64-inlined wasm codec into a `WebAssembly.Module`, portably.
 * No filesystem or network — the bytes are baked into the bundle. Cached so each
 * codec compiles at most once. `Buffer` on Node, `atob` elsewhere.
 */
const moduleCache = new Map<string, Promise<WebAssembly.Module>>();
function loadModule(base64: string): Promise<WebAssembly.Module> {
  let mod = moduleCache.get(base64);
  if (!mod) {
    const bytes =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64')
        : Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    mod = WebAssembly.compile(bytes);
    moduleCache.set(base64, mod);
  }
  return mod;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- jSquash init() typings omit the WebAssembly.Module overload */
const ready = {
  jpegDec: () => once('jpegDec', async () => (initJpegDec as any)(await loadModule(JPEG_DEC_WASM))),
  jpegEnc: () => once('jpegEnc', async () => (initJpegEnc as any)(await loadModule(JPEG_ENC_WASM))),
  pngDec: () => once('pngDec', async () => (initPngDec as any)(await loadModule(PNG_WASM))),
  pngEnc: () => once('pngEnc', async () => (initPngEnc as any)(await loadModule(PNG_WASM))),
  oxipng: () => once('oxipng', async () => (initOxipng as any)(await loadModule(OXIPNG_WASM))),
  webpDec: () => once('webpDec', async () => (initWebpDec as any)(await loadModule(WEBP_DEC_WASM))),
  webpEnc: () => once('webpEnc', async () => (initWebpEnc as any)(await loadModule(WEBP_ENC_WASM))),
  resize: () => once('resize', async () => initResize(await loadModule(RESIZE_WASM) as any)),
  pngquant: () => once('pngquant', async () => icodecPng.loadEncoder(await loadModule(PNGQUANT_WASM) as any)),
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
  const fromMime = mimeType?.split('/')[1]?.replace('jpg', 'jpeg');
  if (fromMime === 'jpeg' || fromMime === 'png' || fromMime === 'webp') {
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
