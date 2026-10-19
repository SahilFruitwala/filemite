/** Canvas helpers for the tools that edit images in the browser. */
import { MAX_INPUT_PIXELS } from '@/lib/limits';

/** Longest side of on-screen previews; exports are always rendered at full size. */
export const PREVIEW_MAX_SIDE = 1600;

/** Same pixel budget as the server tools, so a huge image can't exhaust the tab's memory. */
export const MAX_CANVAS_PIXELS = MAX_INPUT_PIXELS;

export type OutputMime = 'image/png' | 'image/jpeg' | 'image/webp';

/** Keeps PNG, JPEG and WebP as they are; formats browsers can't encode (GIF, AVIF) become PNG. */
export function outputMime(inputType: string): OutputMime {
  if (inputType === 'image/jpeg' || inputType === 'image/webp') return inputType;
  return 'image/png';
}

/** Dimensions scaled down (never up) so the longest side is at most `maxSide`. */
export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: false });
  if (!context) throw new Error('Your browser couldn’t create a drawing surface.');
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: OutputMime, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Your browser couldn’t save an image this large. Try a smaller one.')),
      mime,
      quality,
    );
  });
}

/** JPEG has no transparency; paint white first so cleared areas don't turn black. */
export function paintBackground(context: CanvasRenderingContext2D, mime: OutputMime) {
  if (mime !== 'image/jpeg') return;
  context.save();
  context.fillStyle = '#fff';
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}
