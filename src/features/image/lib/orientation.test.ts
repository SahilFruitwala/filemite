import { describe, expect, test } from 'vitest';
import {
  IDENTITY,
  canvasTransform,
  flipHorizontal,
  flipVertical,
  isIdentity,
  isSideways,
  orientedSize,
  rotateLeft,
  rotateRight,
  type Orientation,
} from './orientation';

/** Where the point (x, y) ends up under an orientation. */
const apply = (o: Orientation, x: number, y: number) => [o.a * x + o.b * y, o.c * x + o.d * y];

describe('quarter turns', () => {
  test('rotating right sends the right edge to the bottom (clockwise on screen)', () => {
    expect(apply(rotateRight(IDENTITY), 1, 0)).toEqual([0, 1]);
    expect(apply(rotateRight(IDENTITY), 0, 1)).toEqual([-1, 0]);
  });

  test('rotating left is the opposite direction', () => {
    expect(apply(rotateLeft(IDENTITY), 1, 0)).toEqual([0, -1]);
  });

  test('four turns either way return to the start', () => {
    let right = IDENTITY;
    let left = IDENTITY;
    for (let i = 0; i < 4; i++) {
      right = rotateRight(right);
      left = rotateLeft(left);
    }
    expect(isIdentity(right)).toBe(true);
    expect(isIdentity(left)).toBe(true);
  });

  test('left cancels right', () => {
    expect(isIdentity(rotateLeft(rotateRight(IDENTITY)))).toBe(true);
  });
});

describe('flips', () => {
  test('are their own inverse', () => {
    expect(isIdentity(flipHorizontal(flipHorizontal(IDENTITY)))).toBe(true);
    expect(isIdentity(flipVertical(flipVertical(IDENTITY)))).toBe(true);
  });

  test('horizontal mirrors left-right and vertical mirrors top-bottom', () => {
    expect(apply(flipHorizontal(IDENTITY), 1, 2)).toEqual([-1, 2]);
    expect(apply(flipVertical(IDENTITY), 1, 2)).toEqual([1, -2]);
  });

  test('both flips equal a half turn', () => {
    const both = flipVertical(flipHorizontal(IDENTITY));
    const half = rotateRight(rotateRight(IDENTITY));
    expect(both).toEqual(half);
  });

  test('flip applies to what the user sees, so it depends on prior rotation', () => {
    // After turning right the picture's top is on the right; "flip horizontal" mirrors the
    // screen, which is a vertical flip of the original pixels.
    const turned = rotateRight(IDENTITY);
    expect(flipHorizontal(turned)).toEqual(
      rotateRight(flipVertical(IDENTITY)),
    );
    expect(flipHorizontal(turned)).not.toEqual(rotateRight(flipHorizontal(IDENTITY)));
  });
});

describe('size and transform', () => {
  test('quarter turns swap width and height, flips and half turns do not', () => {
    expect(orientedSize(300, 200, rotateRight(IDENTITY))).toEqual({ width: 200, height: 300 });
    expect(orientedSize(300, 200, rotateLeft(IDENTITY))).toEqual({ width: 200, height: 300 });
    expect(orientedSize(300, 200, flipHorizontal(IDENTITY))).toEqual({ width: 300, height: 200 });
    expect(orientedSize(300, 200, rotateRight(rotateRight(IDENTITY)))).toEqual({
      width: 300,
      height: 200,
    });
    expect(isSideways(IDENTITY)).toBe(false);
  });

  test('canvas transform centres the output and transposes the matrix', () => {
    expect(canvasTransform(300, 200, IDENTITY)).toEqual([1, 0, 0, 1, 150, 100]);
    // Rotate right: x' = -y, y' = x → canvas (a, b, c, d) = (0, 1, -1, 0).
    expect(canvasTransform(300, 200, rotateRight(IDENTITY))).toEqual([0, 1, -1, 0, 100, 150]);
  });

  test('the transform moves the source corners onto the output canvas', () => {
    const o = rotateRight(IDENTITY);
    const [a, b, c, d, e, f] = canvasTransform(300, 200, o);
    const map = (x: number, y: number) => [a * x + c * y + e, b * x + d * y + f];
    // Top-left of the source (relative to its centre) lands at the top-right of a 200×300 canvas.
    expect(map(-150, -100)).toEqual([200, 0]);
    expect(map(150, 100)).toEqual([0, 300]);
  });
});
