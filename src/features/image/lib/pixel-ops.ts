/**
 * In-place pixel operations on RGBA data, restricted to a rectangle. They work
 * on plain `{ data, width, height }` so they run (and are tested) without a
 * canvas. Callers keep rectangles inside the image — see `clampRect`.
 */

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** Paints the rectangle one solid colour. */
export function fillRect(image: Pixels, rect: Rect, rgba: [number, number, number, number]) {
  const { data, width } = image;
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const i = (y * width + x) * 4;
      data[i] = rgba[0];
      data[i + 1] = rgba[1];
      data[i + 2] = rgba[2];
      data[i + 3] = rgba[3];
    }
  }
}

/** Replaces each `blockSize` square with its average colour. Blocks are aligned to the rectangle. */
export function pixelate(image: Pixels, rect: Rect, blockSize: number) {
  const { data, width } = image;
  const size = Math.max(1, Math.round(blockSize));
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  for (let by = rect.y; by < bottom; by += size) {
    for (let bx = rect.x; bx < right; bx += size) {
      const endX = Math.min(bx + size, right);
      const endY = Math.min(by + size, bottom);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let y = by; y < endY; y++) {
        for (let x = bx; x < endX; x++) {
          const i = (y * width + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
        }
      }
      const count = (endX - bx) * (endY - by);
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);
      for (let y = by; y < endY; y++) {
        for (let x = bx; x < endX; x++) {
          const i = (y * width + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }
  }
}

/**
 * Blurs the rectangle with three box-blur passes (a close match for a Gaussian).
 * Samples never leave the rectangle, so nothing outside it bleeds in.
 */
export function boxBlur(image: Pixels, rect: Rect, radius: number) {
  const r = Math.max(0, Math.round(radius));
  if (r === 0 || rect.width === 0 || rect.height === 0) return;

  const { data, width } = image;
  // Work on a copy of just the region, as floats-in-bytes: one line at a time keeps memory small.
  const length = Math.max(rect.width, rect.height);
  const line = new Float32Array(length * 4);
  const out = new Float32Array(length * 4);

  const pass = (count: number, read: (index: number) => number, write: (index: number) => number) => {
    for (let i = 0; i < count; i++) {
      const o = read(i);
      for (let c = 0; c < 4; c++) line[i * 4 + c] = data[o + c];
    }
    // Sliding window with edge samples clamped to the line.
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += line[Math.min(count - 1, Math.max(0, k)) * 4 + c];
      for (let i = 0; i < count; i++) {
        out[i * 4 + c] = sum / (2 * r + 1);
        const leaving = Math.max(0, i - r);
        const entering = Math.min(count - 1, i + r + 1);
        sum += line[entering * 4 + c] - line[leaving * 4 + c];
      }
    }
    for (let i = 0; i < count; i++) {
      const o = write(i);
      for (let c = 0; c < 4; c++) data[o + c] = Math.round(out[i * 4 + c]);
    }
  };

  for (let round = 0; round < 3; round++) {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      const row = (y * width + rect.x) * 4;
      pass(rect.width, (i) => row + i * 4, (i) => row + i * 4);
    }
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const column = (rect.y * width + x) * 4;
      pass(rect.height, (i) => column + i * width * 4, (i) => column + i * width * 4);
    }
  }
}
