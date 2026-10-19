import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import {
  APPLE_TOUCH_SIZE,
  FAVICON_SIZES,
  generateFavicons,
  getImageDimensions,
  ImageInputError,
  processImage,
  scrubImage,
  sniffFormat,
  toInputError,
} from './image';

function solid(width: number, height: number, format: 'png' | 'jpeg' | 'webp' = 'png') {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } },
  })
    .toFormat(format)
    .toBuffer();
}

describe('sniffFormat', () => {
  test('detects formats from magic bytes, ignoring a wrong MIME type', async () => {
    expect(sniffFormat(await solid(8, 8, 'png'), 'image/jpeg')).toBe('png');
    expect(sniffFormat(await solid(8, 8, 'jpeg'), 'image/png')).toBe('jpeg');
    expect(sniffFormat(await solid(8, 8, 'webp'), 'application/octet-stream')).toBe('webp');
  });

  test('detects HEIC from the ftyp brand', () => {
    const bytes = Buffer.alloc(16);
    bytes.write('ftyp', 4, 'ascii');
    bytes.write('heic', 8, 'ascii');
    expect(sniffFormat(bytes)).toBe('heif');
  });

  test('falls back to the MIME type for short or unrecognised input', () => {
    expect(sniffFormat(Buffer.alloc(4), 'image/jpg')).toBe('jpeg');
    expect(sniffFormat(Buffer.alloc(32), 'image/heif')).toBe('heif');
    expect(sniffFormat(Buffer.alloc(32), 'image/gif')).toBeNull();
    expect(sniffFormat(Buffer.alloc(32))).toBeNull();
  });
});

describe('processImage', () => {
  test('downscales wide images to maxWidth but never enlarges', async () => {
    const wide = await processImage(await solid(3000, 1000), {
      quality: 75,
      targetFormat: 'jpeg',
      maxWidth: 1920,
    });
    expect(wide.width).toBe(1920);
    expect(wide.format).toBe('jpeg');

    const small = await processImage(await solid(300, 200), {
      quality: 75,
      targetFormat: 'webp',
      maxWidth: 1920,
    });
    expect(small.width).toBe(300);
  });

  test('maxWidth 0 keeps the original size (used for format conversion)', async () => {
    const out = await processImage(await solid(3000, 1000), {
      quality: 90,
      targetFormat: 'webp',
      maxWidth: 0,
    });
    expect([out.width, out.height]).toEqual([3000, 1000]);
  });

  test.each([
    ['cover', 200, 100],
    ['fill', 200, 100],
    ['contain', 200, 100],
  ] as const)('%s produces the exact requested box', async (fit, width, height) => {
    const out = await processImage(await solid(400, 400), {
      quality: 80,
      targetFormat: 'png',
      width,
      height,
      fit,
    });
    expect([out.width, out.height]).toEqual([width, height]);
  });

  test('inside keeps the aspect ratio within the box', async () => {
    const out = await processImage(await solid(400, 200), {
      quality: 80,
      targetFormat: 'png',
      width: 100,
      height: 100,
      fit: 'inside',
    });
    expect([out.width, out.height]).toEqual([100, 50]);
  });

  test('crops, clamping an area that overruns the image', async () => {
    const out = await processImage(await solid(100, 100), {
      quality: 80,
      targetFormat: 'png',
      maxWidth: undefined,
      crop: { x: 60, y: 60, width: 500, height: 500 },
    });
    expect([out.width, out.height]).toEqual([40, 40]);
  });

  test('lossless PNG round-trips pixels exactly', async () => {
    const input = await solid(32, 32);
    const out = await processImage(input, {
      quality: 100,
      lossless: true,
      targetFormat: 'png',
      maxWidth: undefined,
    });
    const [a, b] = await Promise.all(
      [input, out.data].map((buffer) => sharp(buffer).raw().toBuffer()),
    );
    expect(a.equals(b)).toBe(true);
  });

  test('lower quality yields a smaller JPEG', async () => {
    const noisy = await sharp(randomBytes(256 * 256 * 3), {
      raw: { width: 256, height: 256, channels: 3 },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
    const high = await processImage(noisy, { quality: 90, targetFormat: 'jpeg', maxWidth: undefined });
    const low = await processImage(noisy, { quality: 40, targetFormat: 'jpeg', maxWidth: undefined });
    expect(low.data.byteLength).toBeLessThan(high.data.byteLength);
  });

  test('applies EXIF orientation', async () => {
    const rotated = await sharp(await solid(100, 40, 'jpeg'))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const out = await processImage(rotated, {
      quality: 80,
      targetFormat: 'png',
      maxWidth: undefined,
    });
    expect([out.width, out.height]).toEqual([40, 100]);
  });

  test('rejects garbage input', async () => {
    await expect(
      processImage(Buffer.from('definitely not an image'), {
        quality: 80,
        targetFormat: 'png',
      }),
    ).rejects.toThrow();
  });
});

describe('scrubImage', () => {
  test('removes EXIF metadata from a JPEG', async () => {
    const tagged = await sharp(await solid(64, 64, 'jpeg'))
      .withExif({ IFD0: { Copyright: 'secret-owner', Artist: 'someone' } })
      .jpeg()
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    expect(tagged.includes('secret-owner')).toBe(true);

    const clean = await scrubImage(tagged, 'jpeg');
    expect((await sharp(clean).metadata()).exif).toBeUndefined();
    expect(clean.includes('secret-owner')).toBe(false);
  });
});

describe('getImageDimensions', () => {
  test('reports size and format', async () => {
    expect(await getImageDimensions(await solid(12, 34, 'webp'))).toEqual({
      width: 12,
      height: 34,
      format: 'webp',
    });
  });
});

describe('toInputError', () => {
  test('maps Sharp pixel-limit and corruption errors to ImageInputError', () => {
    expect(toInputError(new Error('Input image exceeds pixel limit'))).toBeInstanceOf(ImageInputError);
    expect(toInputError(new Error('Input buffer contains unsupported image format'))).toBeInstanceOf(
      ImageInputError,
    );
    expect(toInputError(new Error('premature end of JPEG'))).toBeInstanceOf(ImageInputError);
  });

  test('ignores unrelated failures', () => {
    expect(toInputError(new Error('ENOMEM'))).toBeNull();
    expect(toInputError('nope')).toBeNull();
  });

  test('a real oversized decode is rejected by the pixel limit', async () => {
    // 8000 x 8000 = 64 MP, over the 50 MP cap; a flat PNG stays tiny on the wire.
    const bomb = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: '#000' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(bomb.byteLength).toBeLessThan(4 * 1024 * 1024);
    const error = await processImage(bomb, { quality: 80, targetFormat: 'jpeg' }).catch(
      (reason: unknown) => reason,
    );
    expect(toInputError(error)).toBeInstanceOf(ImageInputError);
  });
});

describe('generateFavicons', () => {
  test('builds every size, an opaque Apple icon and a multi-size ICO', async () => {
    const files = await generateFavicons(await solid(300, 200));
    for (const size of FAVICON_SIZES) {
      const meta = await sharp(files[`favicon-${size}x${size}.png`]).metadata();
      expect([meta.width, meta.height]).toEqual([size, size]);
    }
    const apple = await sharp(files['apple-touch-icon.png']).metadata();
    expect(apple.width).toBe(APPLE_TOUCH_SIZE);
    expect(apple.hasAlpha).toBe(false);

    const ico = files['favicon.ico'];
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(3);
  });
});
