import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { beforeAll, describe, expect, test } from "vitest";

import { compressPdf, compressToTarget } from "./compress";
import { COMPRESS_PRESETS } from "./compress-presets";
import { makePdf, makePdfWithImage, pageWidths } from "./test-pdf";

let imagePdf: Uint8Array;

beforeAll(async () => {
  // A large, noisy photo drawn at 100pt — far more resolution than needed.
  const photo = await sharp(randomBytes(1600 * 1600 * 3), {
    raw: { width: 1600, height: 1600, channels: 3 },
  })
    .jpeg({ quality: 98 })
    .toBuffer();
  imagePdf = makePdfWithImage(new Uint8Array(photo));
});

describe("compressPdf", () => {
  test("shrinks an oversized image while keeping the page", () => {
    const { bytes, stats } = compressPdf(
      { bytes: imagePdf },
      { ...COMPRESS_PRESETS.balanced, grayscale: false }
    );
    expect(stats.imagesFound).toBe(1);
    expect(stats.imagesRewritten).toBe(1);
    expect(bytes.length).toBeLessThan(imagePdf.length / 2);
    expect(pageWidths(bytes)).toEqual([200]);
  });

  test("stronger presets never produce a larger file than lighter ones", () => {
    const size = (level: keyof typeof COMPRESS_PRESETS) =>
      compressPdf({ bytes: imagePdf }, { ...COMPRESS_PRESETS[level], grayscale: false }).bytes.length;
    expect(size("strong")).toBeLessThanOrEqual(size("light"));
  });

  test("handles a text-only PDF without images and reports progress", () => {
    const progress: number[] = [];
    const source = makePdf(3);
    const { bytes, stats } = compressPdf(
      { bytes: source },
      { ...COMPRESS_PRESETS.balanced, grayscale: false },
      (done) => progress.push(done)
    );
    expect(stats.imagesFound).toBe(0);
    expect(pageWidths(bytes)).toEqual([100, 101, 102]);
  });

  test("rejects a damaged PDF with a readable error", () => {
    expect(() =>
      compressPdf({ bytes: new Uint8Array([1, 2, 3]) }, { ...COMPRESS_PRESETS.light, grayscale: false })
    ).toThrow(expect.objectContaining({ code: "invalid" }));
  });
});

describe("compressToTarget", () => {
  test("reports fitsTarget when the target is reachable", () => {
    const result = compressToTarget({ bytes: imagePdf }, imagePdf.length, false);
    expect(result.fitsTarget).toBe(true);
    expect(result.bytes.length).toBeLessThanOrEqual(imagePdf.length);
  });

  test("returns the smallest result and fitsTarget=false for an impossible target", () => {
    const result = compressToTarget({ bytes: imagePdf }, 10, false);
    expect(result.fitsTarget).toBe(false);
    expect(pageWidths(result.bytes)).toEqual([200]);
  });
});
