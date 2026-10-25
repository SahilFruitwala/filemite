/**
 * Output size and draw rectangles for a resize, matching Sharp's `resize()`
 * so browser processing gives the same dimensions as /api/image/compress.
 */
export type ResizeFit = 'cover' | 'contain' | 'inside' | 'fill';

export type Rect = { x: number; y: number; width: number; height: number };

export type ResizePlan = {
  /** Canvas size. */
  width: number;
  height: number;
  /** Part of the source image to draw. */
  source: Rect;
  /** Where it lands on the canvas; `contain` leaves transparent padding around it. */
  target: Rect;
};

export type ResizeRequest = {
  width?: number;
  height?: number;
  fit?: ResizeFit;
  /** Caps the width (never enlarging) when no explicit size is given; 0 switches it off. */
  maxWidth?: number;
};

const px = (value: number) => Math.max(1, Math.round(value));

export function planResize(
  sourceWidth: number,
  sourceHeight: number,
  { width, height, fit = 'cover', maxWidth = 0 }: ResizeRequest,
): ResizePlan {
  const whole: Rect = { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const scaled = (scale: number): ResizePlan => {
    const out = { width: px(sourceWidth * scale), height: px(sourceHeight * scale) };
    return { ...out, source: whole, target: { x: 0, y: 0, ...out } };
  };

  if (width === undefined && height === undefined) {
    return scaled(maxWidth && sourceWidth > maxWidth ? maxWidth / sourceWidth : 1);
  }
  // One side given: keep the shape, whatever the fit.
  if (width === undefined) return scaled(height! / sourceHeight);
  if (height === undefined) return scaled(width / sourceWidth);

  const frame = { x: 0, y: 0, width, height };
  switch (fit) {
    case 'fill':
      return { width, height, source: whole, target: frame };
    case 'inside':
      return scaled(Math.min(width / sourceWidth, height / sourceHeight));
    case 'contain': {
      const scale = Math.min(width / sourceWidth, height / sourceHeight);
      const w = px(sourceWidth * scale);
      const h = px(sourceHeight * scale);
      const target = {
        x: Math.floor((width - w) / 2),
        y: Math.floor((height - h) / 2),
        width: w,
        height: h,
      };
      return { width, height, source: whole, target };
    }
    case 'cover': {
      // Trim the centre of the source to the frame's shape.
      const scale = Math.max(width / sourceWidth, height / sourceHeight);
      const w = Math.min(sourceWidth, width / scale);
      const h = Math.min(sourceHeight, height / scale);
      const source = { x: (sourceWidth - w) / 2, y: (sourceHeight - h) / 2, width: w, height: h };
      return { width, height, source, target: frame };
    }
  }
}
