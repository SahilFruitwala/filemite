import { describe, expect, test } from 'vitest';
import {
  MAX_TILES,
  WATERMARK_POSITIONS,
  clampRect,
  placeWatermark,
  rectFromPoints,
  tilePositions,
  toImagePoint,
} from './edit-geometry';

describe('rectFromPoints', () => {
  test('is the same whichever corner the drag started from', () => {
    const expected = { x: 10, y: 20, width: 30, height: 40 };
    expect(rectFromPoints({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual(expected);
    expect(rectFromPoints({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual(expected);
    expect(rectFromPoints({ x: 40, y: 20 }, { x: 10, y: 60 })).toEqual(expected);
  });
});

describe('clampRect', () => {
  test('rounds outwards so the whole selection is covered', () => {
    expect(clampRect({ x: 1.2, y: 2.7, width: 3.1, height: 2.2 }, 100, 100)).toEqual({
      x: 1,
      y: 2,
      width: 4,
      height: 3,
    });
  });

  test('trims to the image and rejects selections outside or empty', () => {
    expect(clampRect({ x: -10, y: -10, width: 30, height: 30 }, 100, 100)).toEqual({
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    });
    expect(clampRect({ x: 90, y: 90, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 90,
      y: 90,
      width: 10,
      height: 10,
    });
    expect(clampRect({ x: 200, y: 0, width: 10, height: 10 }, 100, 100)).toBeNull();
    expect(clampRect({ x: 5, y: 5, width: 0, height: 10 }, 100, 100)).toBeNull();
  });
});

describe('toImagePoint', () => {
  const bounds = { left: 100, top: 50, width: 200, height: 100 };

  test('scales screen pixels to image pixels', () => {
    expect(toImagePoint({ x: 200, y: 100 }, bounds, 2000, 1000)).toEqual({ x: 1000, y: 500 });
  });

  test('clamps points outside the image', () => {
    expect(toImagePoint({ x: 0, y: 0 }, bounds, 2000, 1000)).toEqual({ x: 0, y: 0 });
    expect(toImagePoint({ x: 999, y: 999 }, bounds, 2000, 1000)).toEqual({ x: 2000, y: 1000 });
  });
});

describe('placeWatermark', () => {
  const image = { width: 1000, height: 600 };
  const mark = { width: 100, height: 50 };

  test.each([
    ['top-left', { x: 20, y: 20 }],
    ['top-center', { x: 450, y: 20 }],
    ['top-right', { x: 880, y: 20 }],
    ['middle-left', { x: 20, y: 275 }],
    ['center', { x: 450, y: 275 }],
    ['middle-right', { x: 880, y: 275 }],
    ['bottom-left', { x: 20, y: 530 }],
    ['bottom-center', { x: 450, y: 530 }],
    ['bottom-right', { x: 880, y: 530 }],
  ] as const)('%s', (position, expected) => {
    expect(placeWatermark(image, mark, position, 20)).toEqual(
      position === 'center' ? { x: 450, y: 275 } : expected,
    );
  });

  test('covers every named position', () => {
    expect(WATERMARK_POSITIONS).toHaveLength(9);
  });
});

describe('tilePositions', () => {
  const mark = { width: 100, height: 50 };

  test('covers the image edge to edge with the requested gap', () => {
    const points = tilePositions({ width: 400, height: 200 }, mark, 50);
    const xs = points.filter((p) => p.y === 0).map((p) => p.x);
    expect(xs).toEqual([0, 150, 300]);
    expect(new Set(points.map((p) => p.y))).toEqual(new Set([0, 100]));
  });

  test('staggers alternate rows by half a step', () => {
    const points = tilePositions({ width: 400, height: 200 }, mark, 50);
    expect(points.filter((p) => p.y === 100)[0].x).toBe(-75);
  });

  test('is capped so a tiny mark on a big image stays cheap', () => {
    expect(tilePositions({ width: 20000, height: 20000 }, { width: 2, height: 2 }, 0)).toHaveLength(
      MAX_TILES,
    );
  });

  test('never loops forever on a zero-size mark', () => {
    expect(tilePositions({ width: 100, height: 100 }, { width: 0, height: 0 }, 0).length).toBeLessThanOrEqual(
      MAX_TILES,
    );
  });
});
