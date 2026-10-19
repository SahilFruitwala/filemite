/** Hiding parts of an image: how strong each method is, and drawing it onto a canvas. */
import { clampRect } from './edit-geometry';
import { boxBlur, fillRect, pixelate, type Rect } from './pixel-ops';

export type RedactMode = 'blackout' | 'pixelate' | 'blur';

export const STRENGTH_MIN = 1;
export const STRENGTH_MAX = 10;
export const STRENGTH_DEFAULT = 5;

/**
 * Block size (pixelate) or radius (blur) in source pixels for a strength of 1–10.
 * It scales with the image: a fixed size that hides a face in a 500 px image
 * would barely touch the same face in a 4000 px photo.
 */
export function redactionAmount(
  mode: RedactMode,
  strength: number,
  image: { width: number; height: number },
): number {
  if (mode === 'blackout') return 0;
  const level = Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, strength));
  const unit = Math.max(image.width, image.height) / 200;
  return mode === 'pixelate'
    ? Math.max(4, Math.round(unit * level))
    : Math.max(3, Math.round(unit * level * 0.6));
}

/**
 * Applies the effect to each region of an already-drawn canvas. `regions` are in
 * source-image pixels; `scale` converts them (and `amount`) to this canvas, so a
 * downscaled preview shows the same thing the full-size export will contain.
 */
export function applyRedactions(
  context: CanvasRenderingContext2D,
  regions: Rect[],
  mode: RedactMode,
  amount: number,
  scale: number,
) {
  const { width, height } = context.canvas;
  for (const region of regions) {
    const area = clampRect(
      {
        x: region.x * scale,
        y: region.y * scale,
        width: region.width * scale,
        height: region.height * scale,
      },
      width,
      height,
    );
    if (!area) continue;

    // Only the region is read and written back, so cost doesn't depend on image size.
    const pixels = context.getImageData(area.x, area.y, area.width, area.height);
    const whole = { x: 0, y: 0, width: area.width, height: area.height };
    if (mode === 'blackout') fillRect(pixels, whole, [0, 0, 0, 255]);
    else if (mode === 'pixelate') pixelate(pixels, whole, Math.max(1, amount * scale));
    else boxBlur(pixels, whole, Math.max(1, amount * scale));
    context.putImageData(pixels, area.x, area.y);
  }
}
