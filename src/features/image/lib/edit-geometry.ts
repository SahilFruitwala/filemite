/** Rectangle and placement maths shared by the canvas editing tools. */
import type { Rect } from './pixel-ops';

export type Point = { x: number; y: number };

/** The rectangle spanned by two corner points, whichever way the user dragged. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Rounds a rectangle to whole pixels and trims it to the image; null if nothing is left. */
export function clampRect(rect: Rect, imageWidth: number, imageHeight: number): Rect | null {
  const left = Math.max(0, Math.floor(rect.x));
  const top = Math.max(0, Math.floor(rect.y));
  const right = Math.min(imageWidth, Math.ceil(rect.x + rect.width));
  const bottom = Math.min(imageHeight, Math.ceil(rect.y + rect.height));
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Converts a pointer position to image pixels, given where the image is drawn
 * on screen (`bounds`, from getBoundingClientRect) — correct at any display scale.
 */
export function toImagePoint(
  client: Point,
  bounds: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): Point {
  const x = ((client.x - bounds.left) / bounds.width) * imageWidth;
  const y = ((client.y - bounds.top) / bounds.height) * imageHeight;
  return {
    x: Math.min(imageWidth, Math.max(0, x)),
    y: Math.min(imageHeight, Math.max(0, y)),
  };
}

export const WATERMARK_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

/** Top-left corner for a mark of `mark` size, inset by `margin` from the chosen edge. */
export function placeWatermark(
  image: { width: number; height: number },
  mark: { width: number; height: number },
  position: WatermarkPosition,
  margin: number,
): Point {
  const [row, column] = position === 'center' ? ['middle', 'center'] : position.split(/-/);
  const x =
    column === 'left'
      ? margin
      : column === 'right'
        ? image.width - mark.width - margin
        : (image.width - mark.width) / 2;
  const y =
    row === 'top'
      ? margin
      : row === 'bottom'
        ? image.height - mark.height - margin
        : (image.height - mark.height) / 2;
  return { x, y };
}

/** Upper bound on tiles, so a tiny mark on a huge image can't freeze the tab. */
export const MAX_TILES = 2500;

/**
 * Grid positions (top-left corners) covering the image with marks of `mark` size
 * separated by `gap`. Every other row is offset by half a step, for a staggered look.
 */
export function tilePositions(
  image: { width: number; height: number },
  mark: { width: number; height: number },
  gap: number,
): Point[] {
  const stepX = Math.max(1, mark.width + gap);
  const stepY = Math.max(1, mark.height + gap);
  const points: Point[] = [];
  for (let row = 0, y = 0; y < image.height && points.length < MAX_TILES; row++, y += stepY) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = 0 - offset; x < image.width && points.length < MAX_TILES; x += stepX) {
      points.push({ x, y });
    }
  }
  return points;
}
