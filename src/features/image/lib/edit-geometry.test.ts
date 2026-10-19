import { describe, expect, test } from 'vitest';
import {
  MAX_TILES,
  centeredRect,
  nudgeRect,
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
    const points = tilePositions({ width: 400, height: 200 }, mark, { x: 50, y: 50 });
    const xs = points.filter((p) => p.y === 0).map((p) => p.x);
    expect(xs).toEqual([0, 150, 300]);
    expect(new Set(points.map((p) => p.y))).toEqual(new Set([0, 100]));
  });

  test('uses separate horizontal and vertical gaps', () => {
    const points = tilePositions({ width: 400, height: 400 }, mark, { x: 0, y: 150 });
    expect(new Set(points.map((p) => p.y))).toEqual(new Set([0, 200, 400].filter((y) => y < 400)));
    expect(points.filter((p) => p.y === 0).map((p) => p.x)).toEqual([0, 100, 200, 300]);
  });

  test('staggers alternate rows by half a step', () => {
    const points = tilePositions({ width: 400, height: 200 }, mark, { x: 50, y: 50 });
    expect(points.filter((p) => p.y === 100)[0].x).toBe(-75);
  });

  test('is capped so a tiny mark on a big image stays cheap', () => {
    expect(tilePositions({ width: 20000, height: 20000 }, { width: 2, height: 2 }, { x: 0, y: 0 })).toHaveLength(
      MAX_TILES,
    );
  });

  test('never loops forever on a zero-size mark', () => {
    expect(tilePositions({ width: 100, height: 100 }, { width: 0, height: 0 }, { x: 0, y: 0 }).length).toBeLessThanOrEqual(
      MAX_TILES,
    );
  });
});

describe('nudgeRect', () => {
  const image = { width: 100, height: 80 };
  const box = { x: 20, y: 30, width: 40, height: 20 };

  test('moves in the arrow direction', () => {
    expect(nudgeRect(box, 'ArrowRight', 5, false, image)).toEqual({ ...box, x: 25 });
    expect(nudgeRect(box, 'ArrowLeft', 5, false, image)).toEqual({ ...box, x: 15 });
    expect(nudgeRect(box, 'ArrowUp', 5, false, image)).toEqual({ ...box, y: 25 });
    expect(nudgeRect(box, 'ArrowDown', 5, false, image)).toEqual({ ...box, y: 35 });
  });

  test('stops at the image edges without changing size', () => {
    expect(nudgeRect({ ...box, x: 2 }, 'ArrowLeft', 5, false, image).x).toBe(0);
    expect(nudgeRect({ ...box, x: 58 }, 'ArrowRight', 5, false, image)).toEqual({ ...box, x: 60 });
    expect(nudgeRect({ ...box, y: 58 }, 'ArrowDown', 5, false, image)).toEqual({ ...box, y: 60 });
  });

  test('resizing grows right and down and shrinks left and up, keeping the corner fixed', () => {
    expect(nudgeRect(box, 'ArrowRight', 5, true, image)).toEqual({ ...box, width: 45 });
    expect(nudgeRect(box, 'ArrowLeft', 5, true, image)).toEqual({ ...box, width: 35 });
    expect(nudgeRect(box, 'ArrowDown', 5, true, image)).toEqual({ ...box, height: 25 });
    expect(nudgeRect(box, 'ArrowUp', 5, true, image)).toEqual({ ...box, height: 15 });
  });

  test('resizing never leaves the image or collapses below one pixel', () => {
    expect(nudgeRect({ ...box, x: 90, width: 8 }, 'ArrowRight', 50, true, image).width).toBe(10);
    expect(nudgeRect(box, 'ArrowLeft', 500, true, image).width).toBe(1);
    expect(nudgeRect(box, 'ArrowUp', 500, true, image).height).toBe(1);
  });
});

describe('centeredRect', () => {
  test('is centred and a fraction of the image', () => {
    expect(centeredRect({ width: 1000, height: 600 }, 0.25)).toEqual({
      x: 375,
      y: 225,
      width: 250,
      height: 150,
    });
  });

  test('stays inside tiny images', () => {
    const rect = centeredRect({ width: 2, height: 2 }, 0.1);
    expect(rect.width).toBeGreaterThanOrEqual(1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(2);
  });
});
