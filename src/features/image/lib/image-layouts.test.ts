import { describe, expect, test } from 'vitest';

import { BACKDROPS, DEFAULT_BEAUTIFY, beautifyLayout, exportScale } from './beautify';
import { collageCells, coverSource, defaultColumns, type Cell, type CollageLayout } from './collage';
import { MIN_DELAY_MS, encodeGif, gifSize, pingPong } from './gif';
import { mmToPx, photoPlacement, sheetLayout } from './passport';

describe('beautifyLayout', () => {
  test('pads the screenshot and centres it', () => {
    const layout = beautifyLayout(1000, 600, { ...DEFAULT_BEAUTIFY, padding: 10, frame: 'none' });
    expect(layout.width).toBe(1200);
    expect(layout.height).toBe(800);
    expect(layout.window).toEqual({ x: 100, y: 100, width: 1000, height: 600 });
    expect(layout.bar).toBeNull();
  });

  test('a window bar adds height above the screenshot', () => {
    const layout = beautifyLayout(1000, 600, { ...DEFAULT_BEAUTIFY, frame: 'dark' });
    expect(layout.bar).not.toBeNull();
    expect(layout.image.y).toBe(layout.window.y + layout.bar!.height);
    expect(layout.window.height).toBe(600 + layout.bar!.height);
  });

  test('a fixed aspect ratio grows the canvas, never shrinks the screenshot', () => {
    const wide = beautifyLayout(1000, 600, { ...DEFAULT_BEAUTIFY, aspect: 1 });
    expect(wide.width).toBe(wide.height);
    expect(wide.window.width).toBe(1000);
    const tall = beautifyLayout(600, 1000, { ...DEFAULT_BEAUTIFY, aspect: 16 / 9 });
    expect(Math.abs(tall.width / tall.height - 16 / 9)).toBeLessThan(0.01);
    // The window stays centred.
    expect(tall.window.x * 2 + tall.window.width).toBeCloseTo(tall.width, -1);
  });

  test('no shadow means no blur or alpha', () => {
    const layout = beautifyLayout(500, 500, { ...DEFAULT_BEAUTIFY, shadow: 0 });
    expect(layout.shadow).toEqual({ blur: 0, offsetY: 0, alpha: 0 });
  });

  test('exportScale only shrinks pictures that are too big', () => {
    expect(exportScale(2000, 1000)).toBe(1);
    expect(exportScale(16384, 4000)).toBe(0.5);
    expect(exportScale(10000, 10000)).toBeLessThan(0.75);
  });

  test('backdrops have unique ids', () => {
    expect(new Set(BACKDROPS.map((item) => item.id)).size).toBe(BACKDROPS.length);
  });
});

function overlaps(a: Cell, b: Cell) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('collageCells', () => {
  const layouts: CollageLayout[] = ['grid', 'row', 'column', 'feature'];

  test.each(layouts.flatMap((layout) => [1, 2, 3, 5, 7, 12].map((count) => [layout, count] as const)))(
    '%s with %i photos: right count, inside the canvas, no overlaps',
    (layout, count) => {
      const cells = collageCells(layout, count, 1200, 900, 12);
      expect(cells).toHaveLength(count);
      for (const cell of cells) {
        expect(cell.width).toBeGreaterThan(0);
        expect(cell.height).toBeGreaterThan(0);
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x + cell.width).toBeLessThanOrEqual(1200);
        expect(cell.y + cell.height).toBeLessThanOrEqual(900);
      }
      cells.forEach((a, i) => cells.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
    },
  );

  test('the last grid row stretches so nothing is left empty', () => {
    const cells = collageCells('grid', 5, 900, 600, 0, 3);
    const lastRow = cells.slice(3);
    expect(lastRow).toHaveLength(2);
    expect(lastRow[0].x).toBe(0);
    expect(lastRow[1].x + lastRow[1].width).toBe(900);
  });

  test('feature gives the first photo the most room', () => {
    const [first, ...rest] = collageCells('feature', 4, 1200, 800, 10);
    expect(first.width * first.height).toBeGreaterThan(rest[0].width * rest[0].height);
  });

  test('defaultColumns suits the canvas shape', () => {
    expect(defaultColumns(4, 1)).toBe(2);
    expect(defaultColumns(6, 16 / 9)).toBeGreaterThanOrEqual(3);
    expect(defaultColumns(1, 1)).toBe(1);
  });
});

describe('coverSource', () => {
  const cell = { x: 10, y: 20, width: 200, height: 100 };
  test('fill crops the centre so the cell is covered', () => {
    const result = coverSource(400, 400, cell, 'fill');
    expect(result.sWidth / result.sHeight).toBeCloseTo(2);
    expect(result.sx).toBe(0);
    expect(result.sy).toBe(100);
    expect([result.dx, result.dy, result.dWidth, result.dHeight]).toEqual([10, 20, 200, 100]);
  });

  test('fit shows the whole image, centred', () => {
    const result = coverSource(400, 400, cell, 'fit');
    expect(result.dWidth).toBe(100);
    expect(result.dHeight).toBe(100);
    expect(result.dx).toBe(60);
    expect(result.sWidth).toBe(400);
  });
});

describe('passport sheets', () => {
  test('mmToPx uses 300 dpi', () => {
    expect(mmToPx(25.4)).toBe(300);
    expect(mmToPx(35)).toBe(413);
  });

  test('picks the orientation that holds more photos and keeps them on the sheet', () => {
    const layout = sheetLayout({ widthMm: 101.6, heightMm: 152.4 }, { widthMm: 35, heightMm: 45 });
    expect(layout.positions).toHaveLength(8);
    expect(layout.width).toBeGreaterThan(layout.height);
    for (const { x, y } of layout.positions) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + layout.photoWidth).toBeLessThanOrEqual(layout.width);
      expect(y + layout.photoHeight).toBeLessThanOrEqual(layout.height);
    }
  });

  test('photos on a sheet never overlap', () => {
    const layout = sheetLayout({ widthMm: 210, heightMm: 297 }, { widthMm: 50.8, heightMm: 50.8 });
    expect(layout.positions.length).toBeGreaterThan(8);
    layout.positions.forEach((a, i) =>
      layout.positions.slice(i + 1).forEach((b) => {
        const apart = Math.abs(a.x - b.x) >= layout.photoWidth || Math.abs(a.y - b.y) >= layout.photoHeight;
        expect(apart).toBe(true);
      }),
    );
  });

  test('a photo bigger than the sheet gives no positions', () => {
    expect(sheetLayout({ widthMm: 50, heightMm: 50 }, { widthMm: 100, heightMm: 100 }).positions).toHaveLength(0);
  });

  test('photoPlacement covers the frame at zoom 1 and moves with the offsets', () => {
    const plain = photoPlacement(400, 300, 100, 100, 1, 0, 0);
    expect(plain.height).toBe(100);
    expect(plain.width).toBeCloseTo(133.33, 1);
    expect(plain.x).toBeCloseTo(-16.67, 1);
    const moved = photoPlacement(400, 300, 100, 100, 2, 0.1, -0.2);
    expect(moved.height).toBe(200);
    expect(moved.y).toBeCloseTo(-50 - 20);
  });
});

describe('gif helpers', () => {
  test('pingPong plays forward then back without repeating the ends', () => {
    expect(pingPong([1, 2, 3, 4])).toEqual([1, 2, 3, 4, 3, 2]);
    expect(pingPong([1, 2])).toEqual([1, 2]);
  });

  test('gifSize limits the longest side and keeps the proportions', () => {
    expect(gifSize(2000, 1000, 500)).toEqual({ width: 500, height: 250 });
    expect(gifSize(200, 100, 500)).toEqual({ width: 200, height: 100 });
  });

  test('encodeGif writes a valid animated GIF', async () => {
    const solid = (r: number, g: number, b: number) => {
      const data = new Uint8ClampedArray(8 * 6 * 4);
      for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i);
      return data;
    };
    const bytes = await encodeGif([solid(255, 0, 0), solid(0, 255, 0), solid(0, 0, 255)], {
      width: 8,
      height: 6,
      delay: 100,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe('GIF89a');
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    expect(view.getUint16(6, true)).toBe(8);
    expect(view.getUint16(8, true)).toBe(6);
    // One graphic control extension (0x21 0xF9) per frame, and the file ends with the trailer.
    let frames = 0;
    for (let i = 0; i < bytes.length - 1; i++) if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) frames++;
    expect(frames).toBe(3);
    expect(bytes[bytes.length - 1]).toBe(0x3b);
    // The Netscape looping extension is present for loops.
    expect(new TextDecoder('latin1').decode(bytes)).toContain('NETSCAPE2.0');
  });

  test('a one-time GIF has no looping extension and short delays are raised', async () => {
    const frame = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const bytes = await encodeGif([frame, frame], { width: 4, height: 4, delay: 1, once: true });
    expect(new TextDecoder('latin1').decode(bytes)).not.toContain('NETSCAPE2.0');
    expect(MIN_DELAY_MS).toBeGreaterThanOrEqual(20);
  });
});
