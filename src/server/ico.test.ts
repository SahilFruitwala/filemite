import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { pngsToIco } from './ico';

const png = (size: number) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#fff' } })
    .png()
    .toBuffer();

describe('pngsToIco', () => {
  test('writes a valid directory pointing at each embedded PNG', async () => {
    const images = await Promise.all([16, 32, 256].map(png));
    const ico = pngsToIco(images);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(3);

    const widths = [0, 1, 2].map((i) => ico[6 + i * 16]);
    expect(widths).toEqual([16, 32, 0]); // 256 is encoded as 0

    images.forEach((image, i) => {
      const entry = 6 + i * 16;
      const length = view.getUint32(entry + 8, true);
      const offset = view.getUint32(entry + 12, true);
      expect(length).toBe(image.length);
      expect(Buffer.from(ico.subarray(offset, offset + length)).equals(image)).toBe(true);
    });
  });

  test('rejects non-PNG data and images over 256px', async () => {
    expect(() => pngsToIco([new Uint8Array(32)])).toThrow('Not a PNG');
    const big = await png(300);
    expect(() => pngsToIco([big])).toThrow('256x256');
  });
});
