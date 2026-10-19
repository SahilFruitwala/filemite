import { describe, expect, test } from "vitest";

import { contentBounds, inkFromPaper } from "./signature";

function image(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(fill(x, y), (y * width + x) * 4);
  }
  return data;
}

describe("contentBounds", () => {
  test("finds the box around opaque pixels", () => {
    const data = image(10, 8, (x, y) => (x >= 3 && x <= 6 && y >= 2 && y <= 4 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    expect(contentBounds(data, 10, 8)).toEqual({ x: 3, y: 2, width: 4, height: 3 });
  });

  test("returns null for an empty image", () => {
    expect(contentBounds(image(4, 4, () => [0, 0, 0, 0]), 4, 4)).toBeNull();
  });

  test("ignores nearly transparent specks", () => {
    const data = image(4, 4, (x, y) => (x === 0 && y === 0 ? [0, 0, 0, 3] : [0, 0, 0, 0]));
    expect(contentBounds(data, 4, 4)).toBeNull();
  });
});

describe("inkFromPaper", () => {
  test("white paper becomes transparent and dark strokes become opaque ink", () => {
    const data = image(3, 1, (x) => [[255, 255, 255, 255], [20, 20, 20, 255], [160, 160, 160, 255]][x] as [number, number, number, number]);
    inkFromPaper(data, [10, 20, 200]);
    expect(Array.from(data.slice(0, 4))).toEqual([10, 20, 200, 0]);
    expect(Array.from(data.slice(4, 8))).toEqual([10, 20, 200, 255]);
    const middle = data[11];
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(255);
  });

  test("keeps existing transparency", () => {
    const data = image(1, 1, () => [0, 0, 0, 0]);
    inkFromPaper(data, [0, 0, 0]);
    expect(data[3]).toBe(0);
  });
});
