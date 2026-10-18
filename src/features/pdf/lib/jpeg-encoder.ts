/**
 * mozjpeg (via Squoosh's WASM build) — 10–30% smaller JPEGs than standard
 * libjpeg at the same visual quality. Loaded once per worker; until it is
 * ready (or if it fails to load) callers fall back to MuPDF's encoder.
 */
import createMozJpeg from "@jsquash/jpeg/codec/enc/mozjpeg_enc.js";
import { defaultOptions } from "@jsquash/jpeg/meta.js";

type MozJpegModule = {
  encode(data: BufferSource, width: number, height: number, options: typeof defaultOptions): Uint8Array;
};

let encoder: MozJpegModule | null = null;

/** In browsers the codec fetches its own .wasm; Node/Bun tests pass a compiled module. */
export async function loadJpegEncoder(wasm?: WebAssembly.Module) {
  if (encoder) return;
  encoder = (await createMozJpeg({
    noInitialRun: true,
    ...(wasm && {
      instantiateWasm(imports: WebAssembly.Imports, callback: (instance: WebAssembly.Instance) => void) {
        const instance = new WebAssembly.Instance(wasm, imports);
        callback(instance);
        return instance.exports;
      },
    }),
  })) as MozJpegModule;
}

export function hasMozJpeg() {
  return encoder !== null;
}

/** Encodes packed RGB or gray samples. Returns null if mozjpeg isn't loaded. */
export function encodeMozJpeg(
  samples: Uint8Array,
  channels: 1 | 3,
  width: number,
  height: number,
  quality: number
): Uint8Array | null {
  if (!encoder) return null;
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0, i = 0, j = 0; p < width * height; p++, i += channels, j += 4) {
    rgba[j] = samples[i];
    rgba[j + 1] = samples[channels === 3 ? i + 1 : i];
    rgba[j + 2] = samples[channels === 3 ? i + 2 : i];
    rgba[j + 3] = 255;
  }
  const output = encoder.encode(rgba, width, height, {
    ...defaultOptions,
    quality,
    // Strict baseline JPEG (8-bit quantisation tables, sequential) is readable
    // by every PDF consumer, including old printers. Without `baseline`,
    // low qualities silently produce extended 16-bit-table JPEGs.
    baseline: true,
    progressive: false,
    color_space: channels === 1 ? 1 : 3,
  });
  return output.slice();
}
