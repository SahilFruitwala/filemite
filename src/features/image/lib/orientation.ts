/**
 * Rotation and flips as a 2×2 matrix, so any sequence of quarter turns and
 * mirrors composes exactly. Coordinates are screen-style (x right, y down) and
 * centred on the image: x' = a·x + b·y, y' = c·x + d·y.
 */
export type Orientation = { a: number; b: number; c: number; d: number };

export const IDENTITY: Orientation = { a: 1, b: 0, c: 0, d: 1 };

/** Applies `step` after `current`, i.e. to what the user is looking at now. */
function then(step: Orientation, current: Orientation): Orientation {
  return {
    a: step.a * current.a + step.b * current.c,
    b: step.a * current.b + step.b * current.d,
    c: step.c * current.a + step.d * current.c,
    d: step.c * current.b + step.d * current.d,
  };
}

// Written as `+ 0` so a result of -0 never leaks into comparisons or snapshots.
const clean = ({ a, b, c, d }: Orientation): Orientation => ({
  a: a + 0,
  b: b + 0,
  c: c + 0,
  d: d + 0,
});

export const rotateRight = (o: Orientation) => clean(then({ a: 0, b: -1, c: 1, d: 0 }, o));
export const rotateLeft = (o: Orientation) => clean(then({ a: 0, b: 1, c: -1, d: 0 }, o));
export const flipHorizontal = (o: Orientation) => clean(then({ a: -1, b: 0, c: 0, d: 1 }, o));
export const flipVertical = (o: Orientation) => clean(then({ a: 1, b: 0, c: 0, d: -1 }, o));

export function isIdentity(o: Orientation): boolean {
  return o.a === 1 && o.b === 0 && o.c === 0 && o.d === 1;
}

/** True when the image ends up on its side, so width and height swap. */
export function isSideways(o: Orientation): boolean {
  return o.a === 0;
}

export function orientedSize(
  width: number,
  height: number,
  o: Orientation,
): { width: number; height: number } {
  return isSideways(o) ? { width: height, height: width } : { width, height };
}

/** Arguments for `CanvasRenderingContext2D.setTransform` (a, b, c, d, e, f) that centre the result. */
export function canvasTransform(
  width: number,
  height: number,
  o: Orientation,
): [number, number, number, number, number, number] {
  const out = orientedSize(width, height, o);
  // Canvas order is (a, b, c, d) = (x-scale, y-skew, x-skew, y-scale) — transposed from ours.
  return [o.a, o.c, o.b, o.d, out.width / 2, out.height / 2];
}
