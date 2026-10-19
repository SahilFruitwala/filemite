/** Stamping text or a logo onto an image, as one mark or tiled across it. */
import { placeWatermark, tilePositions, type WatermarkPosition } from './edit-geometry';

export type WatermarkMark =
  | { kind: 'text'; text: string; color: string }
  | { kind: 'logo'; image: HTMLImageElement };

export type WatermarkSettings = {
  /** Mark width as a percentage of the image width, so it looks alike at any resolution. */
  sizePercent: number;
  /** 0–1. */
  opacity: number;
  position: WatermarkPosition;
  /** Repeat the mark across the whole image instead of placing it once. */
  tile: boolean;
  /** Degrees, clockwise; negative tilts the mark upwards to the right. */
  rotation: number;
};

export const DEFAULT_SETTINGS: WatermarkSettings = {
  sizePercent: 30,
  opacity: 0.6,
  position: 'bottom-right',
  tile: false,
  rotation: 0,
};

/** System fonts only: always available, so the preview and the export measure and draw the same. */
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_WEIGHT = 700;
/** Text is measured at this size and scaled, which keeps hinting from skewing small sizes. */
const MEASURE_PX = 100;
/** Space between the mark and the image edge, as a fraction of the image's shorter side. */
const MARGIN_RATIO = 0.03;
/** Tiled marks are spaced by these fractions of the mark's own size. */
const TILE_GAP = { x: 0.6, y: 1.5 };

/** Width and height of a mark that is `sizePercent` of the image width, given its aspect ratio. */
export function markSize(imageWidth: number, sizePercent: number, aspect: number) {
  const width = Math.max(1, (imageWidth * sizePercent) / 100);
  return { width, height: width / Math.max(0.01, aspect) };
}

/** A shadow colour that keeps the mark readable: dark behind light text, light behind dark text. */
export function shadowFor(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 'rgba(0, 0, 0, 0.45)';
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.55)';
}

/** What the mark looks like once sized: its box, and how to paint it centred on the origin. */
function prepare(context: CanvasRenderingContext2D, mark: WatermarkMark, imageWidth: number, sizePercent: number) {
  if (mark.kind === 'logo') {
    const { naturalWidth: w, naturalHeight: h } = mark.image;
    const box = markSize(imageWidth, sizePercent, w / h);
    return {
      box,
      paint: () => context.drawImage(mark.image, -box.width / 2, -box.height / 2, box.width, box.height),
    };
  }

  context.font = `${FONT_WEIGHT} ${MEASURE_PX}px ${FONT_STACK}`;
  const measured = Math.max(1, context.measureText(mark.text).width);
  const fontPx = Math.max(6, ((imageWidth * sizePercent) / 100 / measured) * MEASURE_PX);
  const box = { width: (measured / MEASURE_PX) * fontPx, height: fontPx * 1.2 };
  return {
    box,
    paint: () => {
      context.font = `${FONT_WEIGHT} ${fontPx}px ${FONT_STACK}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = mark.color;
      context.shadowColor = shadowFor(mark.color);
      context.shadowBlur = fontPx * 0.08;
      context.shadowOffsetY = fontPx * 0.025;
      context.fillText(mark.text, 0, 0);
    },
  };
}

/** Draws the mark over whatever is already on the canvas. Everything is relative to the canvas size. */
export function drawWatermark(
  context: CanvasRenderingContext2D,
  mark: WatermarkMark,
  settings: WatermarkSettings,
) {
  const { width, height } = context.canvas;
  const { box, paint } = prepare(context, mark, width, settings.sizePercent);
  const angle = (settings.rotation * Math.PI) / 180;

  context.save();
  context.globalAlpha = Math.min(1, Math.max(0, settings.opacity));

  if (settings.tile) {
    // Rotate the whole grid about the image centre, over a square big enough to still cover the corners.
    const reach = Math.hypot(width, height);
    context.translate(width / 2, height / 2);
    context.rotate(angle);
    const tiles = tilePositions(
      { width: reach, height: reach },
      box,
      { x: box.width * TILE_GAP.x, y: box.height * TILE_GAP.y },
    );
    for (const tile of tiles) {
      context.save();
      context.translate(tile.x - reach / 2 + box.width / 2, tile.y - reach / 2 + box.height / 2);
      paint();
      context.restore();
    }
  } else {
    const margin = Math.min(width, height) * MARGIN_RATIO;
    const spot = placeWatermark({ width, height }, box, settings.position, margin);
    context.translate(spot.x + box.width / 2, spot.y + box.height / 2);
    context.rotate(angle);
    paint();
  }

  context.restore();
}
