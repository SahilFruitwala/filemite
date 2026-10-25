import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { planResize, type ResizeFit } from './resize-plan';

/** What Sharp produces for the same request, so the browser path can't drift from the server. */
async function sharpSize(
  sourceWidth: number,
  sourceHeight: number,
  width: number | undefined,
  height: number | undefined,
  fit: ResizeFit,
) {
  const { info } = await sharp({
    create: { width: sourceWidth, height: sourceHeight, channels: 3, background: '#000' },
  })
    .resize({ width, height, fit })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height };
}

describe('planResize', () => {
  const cases: [number, number, number | undefined, number | undefined, ResizeFit][] = [
    [4000, 3000, 1080, 1080, 'cover'],
    [4000, 3000, 1080, 1080, 'contain'],
    [4000, 3000, 1080, 1080, 'inside'],
    [4000, 3000, 1080, 1080, 'fill'],
    [3000, 4000, 1200, 630, 'inside'],
    [640, 480, 1920, 1080, 'inside'],
    [4000, 3000, 800, undefined, 'cover'],
    [4000, 3000, undefined, 500, 'cover'],
  ];

  test.each(cases)('%ix%i to %sx%s (%s) matches Sharp', async (sw, sh, w, h, fit) => {
    const plan = planResize(sw, sh, { width: w, height: h, fit });
    expect({ width: plan.width, height: plan.height }).toEqual(await sharpSize(sw, sh, w, h, fit));
  });

  test('cover draws the centre of the source over the whole frame', () => {
    const plan = planResize(4000, 3000, { width: 1000, height: 1000, fit: 'cover' });
    expect(plan.source).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
    expect(plan.target).toEqual({ x: 0, y: 0, width: 1000, height: 1000 });
  });

  test('contain centres the image with padding', () => {
    const plan = planResize(4000, 2000, { width: 1000, height: 1000, fit: 'contain' });
    expect(plan.target).toEqual({ x: 0, y: 250, width: 1000, height: 500 });
  });

  test('maxWidth caps the width without enlarging', () => {
    expect(planResize(4000, 3000, { maxWidth: 1920 })).toMatchObject({ width: 1920, height: 1440 });
    expect(planResize(800, 600, { maxWidth: 1920 })).toMatchObject({ width: 800, height: 600 });
    expect(planResize(4000, 3000, { maxWidth: 0 })).toMatchObject({ width: 4000, height: 3000 });
  });
});
