/** Encoding frames into an animated GIF. */
import { GIFEncoder, applyPalette, quantize } from 'gifenc';

export type GifFrame = Uint8ClampedArray;

export type GifOptions = {
  width: number;
  height: number;
  /** Time each frame is shown, in milliseconds. */
  delay: number;
  /** Play once instead of looping forever. */
  once?: boolean;
};

export const MAX_GIF_FRAMES = 40;

/** GIF stores delays in hundredths of a second, so anything under 20 ms is rounded up by most players. */
export const MIN_DELAY_MS = 20;

/** The frame sequence for a bounce: forwards, then back without repeating the end frames. */
export function pingPong<T>(frames: T[]): T[] {
  if (frames.length < 3) return [...frames];
  return [...frames, ...frames.slice(1, -1).reverse()];
}

/** Each frame gets its own 256-colour palette, which keeps photos from banding. */
export async function encodeGif(
  frames: GifFrame[],
  { width, height, delay, once = false }: GifOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const encoder = GIFEncoder();
  for (const [index, frame] of frames.entries()) {
    const palette = quantize(frame, 256);
    const indexed = applyPalette(frame, palette);
    encoder.writeFrame(indexed, width, height, {
      palette,
      delay: Math.max(MIN_DELAY_MS, delay),
      repeat: once ? -1 : 0,
    });
    onProgress?.(index + 1, frames.length);
    // Quantising is heavy; let the page breathe between frames.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  encoder.finish();
  return encoder.bytes();
}

/** Output size for frames: the longest side limited to `maxSide`, never enlarged beyond the first image. */
export function gifSize(imageWidth: number, imageHeight: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(imageWidth, imageHeight));
  return {
    width: Math.max(1, Math.round(imageWidth * scale)),
    height: Math.max(1, Math.round(imageHeight * scale)),
  };
}
