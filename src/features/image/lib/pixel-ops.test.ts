import { describe, expect, test } from 'vitest';
import { boxBlur, fillRect, pixelate, type Pixels, type Rect } from './pixel-ops';

/** Image whose red channel encodes x, green encodes y, so every pixel is unique. */
function gradient(width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = (x * 255) / Math.max(1, width - 1);
      data[i + 1] = (y * 255) / Math.max(1, height - 1);
      data[i + 2] = (x * 7 + y * 13) % 256;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

const pixelAt = (image: Pixels, x: number, y: number) => {
  const i = (y * image.width + x) * 4;
  return Array.from(image.data.slice(i, i + 4));
};

/** Every pixel outside `rect` must be untouched. */
function expectOutsideUnchanged(before: Pixels, after: Pixels, rect: Rect) {
  for (let y = 0; y < before.height; y++) {
    for (let x = 0; x < before.width; x++) {
      const inside =
        x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
      if (!inside) expect(pixelAt(after, x, y)).toEqual(pixelAt(before, x, y));
    }
  }
}

const clone = (image: Pixels): Pixels => ({ ...image, data: new Uint8ClampedArray(image.data) });
const rect: Rect = { x: 4, y: 3, width: 10, height: 8 };

describe('fillRect', () => {
  test('paints only the rectangle, erasing what was underneath', () => {
    const image = gradient(24, 16);
    const before = clone(image);
    fillRect(image, rect, [0, 0, 0, 255]);
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        expect(pixelAt(image, x, y)).toEqual([0, 0, 0, 255]);
      }
    }
    expectOutsideUnchanged(before, image, rect);
  });
});

describe('pixelate', () => {
  test('makes each block a single colour: the average of the original', () => {
    const image = gradient(24, 16);
    const before = clone(image);
    pixelate(image, { x: 0, y: 0, width: 8, height: 8 }, 4);
    // The top-left 4×4 block should equal the mean of the original 4×4 block.
    let sum = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) sum += pixelAt(before, x, y)[0];
    const expected = Math.round(sum / 16);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) expect(pixelAt(image, x, y)[0]).toBe(expected);
    }
    expect(pixelAt(image, 0, 0)).not.toEqual(pixelAt(before, 0, 0));
  });

  test('only changes pixels inside the rectangle, including partial edge blocks', () => {
    const image = gradient(24, 16);
    const before = clone(image);
    pixelate(image, rect, 6); // 10×8 isn't a multiple of 6
    expectOutsideUnchanged(before, image, rect);
  });

  test('a block size of 1 or less leaves the image as it was', () => {
    const image = gradient(12, 12);
    const before = clone(image);
    pixelate(image, { x: 0, y: 0, width: 12, height: 12 }, 0);
    expect(Array.from(image.data)).toEqual(Array.from(before.data));
  });

  test('removes detail: a checkerboard collapses to flat grey', () => {
    const image: Pixels = { data: new Uint8ClampedArray(8 * 8 * 4), width: 8, height: 8 };
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const v = (x + y) % 2 ? 255 : 0;
        image.data.set([v, v, v, 255], (y * 8 + x) * 4);
      }
    }
    pixelate(image, { x: 0, y: 0, width: 8, height: 8 }, 8);
    const first = pixelAt(image, 0, 0);
    expect(first[0]).toBeGreaterThan(120);
    expect(first[0]).toBeLessThan(135);
    expect(pixelAt(image, 7, 7)).toEqual(first);
  });
});

describe('boxBlur', () => {
  test('only changes pixels inside the rectangle', () => {
    const image = gradient(24, 16);
    const before = clone(image);
    boxBlur(image, rect, 3);
    expectOutsideUnchanged(before, image, rect);
  });

  test('keeps a flat area flat', () => {
    const image: Pixels = { data: new Uint8ClampedArray(10 * 10 * 4).fill(90), width: 10, height: 10 };
    boxBlur(image, { x: 1, y: 1, width: 8, height: 8 }, 4);
    expect(new Set(image.data)).toEqual(new Set([90]));
  });

  test('spreads a bright pixel into its neighbours and lowers its peak', () => {
    const image: Pixels = { data: new Uint8ClampedArray(15 * 15 * 4), width: 15, height: 15 };
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
    image.data.set([255, 255, 255, 255], (7 * 15 + 7) * 4);
    boxBlur(image, { x: 0, y: 0, width: 15, height: 15 }, 2);
    expect(pixelAt(image, 7, 7)[0]).toBeLessThan(255);
    expect(pixelAt(image, 8, 7)[0]).toBeGreaterThan(0);
    expect(pixelAt(image, 7, 8)[0]).toBeGreaterThan(0);
  });

  test('a stronger radius smooths more', () => {
    const variance = (radius: number) => {
      const image = gradient(32, 32);
      for (let i = 0; i < image.data.length; i += 4) image.data[i] = Math.random() * 255; // noise
      boxBlur(image, { x: 0, y: 0, width: 32, height: 32 }, radius);
      const values = Array.from({ length: 32 * 32 }, (_, i) => image.data[i * 4]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    };
    expect(variance(5)).toBeLessThan(variance(1));
  });

  test('radius 0 and empty rectangles are no-ops', () => {
    const image = gradient(10, 10);
    const before = clone(image);
    boxBlur(image, { x: 0, y: 0, width: 10, height: 10 }, 0);
    boxBlur(image, { x: 2, y: 2, width: 0, height: 5 }, 3);
    expect(Array.from(image.data)).toEqual(Array.from(before.data));
  });

  test('handles a radius larger than the region', () => {
    const image = gradient(20, 20);
    expect(() => boxBlur(image, { x: 2, y: 2, width: 5, height: 5 }, 50)).not.toThrow();
  });
});
