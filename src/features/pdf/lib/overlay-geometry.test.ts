import { describe, expect, test } from "vitest";

import { centeredBox, moveBox, resizeBox, toPagePoint } from "./overlay-geometry";

const page = { width: 300, height: 400 };

describe("moveBox", () => {
  test("moves and stops at the page edges", () => {
    const box = { x: 10, y: 10, w: 50, h: 40 };
    expect(moveBox(box, 20, 30, page)).toEqual({ x: 30, y: 40, w: 50, h: 40 });
    expect(moveBox(box, -100, -100, page)).toMatchObject({ x: 0, y: 0 });
    expect(moveBox(box, 1000, 1000, page)).toMatchObject({ x: 250, y: 360 });
  });
});

describe("resizeBox", () => {
  const box = { x: 100, y: 100, w: 60, h: 40 };

  test("keeps the opposite corner fixed", () => {
    expect(resizeBox(box, "se", 20, 10, page)).toEqual({ x: 100, y: 100, w: 80, h: 50 });
    expect(resizeBox(box, "nw", -20, -10, page)).toEqual({ x: 80, y: 90, w: 80, h: 50 });
  });

  test("dragging past the opposite corner flips instead of collapsing", () => {
    const result = resizeBox(box, "se", -100, 0, page);
    expect(result.w).toBeGreaterThanOrEqual(6);
    expect(result.x + result.w).toBeCloseTo(100);
  });

  test("never goes below the minimum size or off the page", () => {
    expect(resizeBox(box, "se", -59, -39, page)).toMatchObject({ w: 6, h: 6 });
    const big = resizeBox(box, "se", 1000, 1000, page);
    expect(big.x + big.w).toBe(300);
    expect(big.y + big.h).toBe(400);
  });

  test("keepAspect preserves proportions from any corner", () => {
    for (const corner of ["nw", "ne", "sw", "se"] as const) {
      const result = resizeBox(box, corner, 24, 7, page, { keepAspect: true });
      expect(result.w / result.h).toBeCloseTo(1.5);
    }
  });

  test("keepAspect stays inside the page", () => {
    const result = resizeBox(box, "se", 1000, 0, page, { keepAspect: true });
    expect(result.x + result.w).toBeLessThanOrEqual(300);
    expect(result.y + result.h).toBeLessThanOrEqual(400);
    expect(result.w / result.h).toBeCloseTo(1.5);
  });
});

describe("centeredBox and toPagePoint", () => {
  test("centres a box on a point and keeps it on the page", () => {
    expect(centeredBox({ x: 100, y: 100 }, 40, 20, page)).toEqual({ x: 80, y: 90, w: 40, h: 20 });
    expect(centeredBox({ x: 2, y: 2 }, 40, 20, page)).toMatchObject({ x: 0, y: 0 });
  });

  test("converts pointer positions to page points", () => {
    const rect = { left: 10, top: 20, width: 150, height: 200 };
    expect(toPagePoint({ x: 85, y: 120 }, rect, page)).toEqual({ x: 150, y: 200 });
    expect(toPagePoint({ x: -50, y: 900 }, rect, page)).toEqual({ x: 0, y: 400 });
  });
});
