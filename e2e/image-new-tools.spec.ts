import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

import { greyImage, markerImage, readPixels } from './fixtures';

async function download(page: Page, action: () => Promise<void>) {
  const [file] = await Promise.all([page.waitForEvent('download'), action()]);
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

test.describe('convert', () => {
  test('PNG to WebP keeps the full size', async ({ page }) => {
    await page.goto('/image/convert');
    await page.setInputFiles('input[type=file]', await greyImage(2400, 1600));
    await page.getByRole('radio', { name: 'WebP' }).click();
    await page.getByRole('button', { name: 'Convert 1 image' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    expect(file.name).toBe('grey.webp');
    const meta = await sharp(file.bytes).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 2400, 1600]);
  });

  test('several images come as one ZIP', async ({ page }) => {
    await page.goto('/image/convert');
    await page.setInputFiles('input[type=file]', [await markerImage(), await greyImage(400, 300)]);
    await page.getByRole('radio', { name: 'JPG' }).click();
    await page.getByRole('button', { name: 'Convert 2 images' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download all as ZIP' }).click());
    expect(file.name).toBe('converted-images.zip');
    const text = file.bytes.toString('latin1');
    expect(text).toContain('marker.jpg');
    expect(text).toContain('grey.jpg');
  });
});

test.describe('collage', () => {
  test('combines photos into one picture', async ({ page }) => {
    await page.goto('/image/collage');
    await page.setInputFiles('input[type=file]', [await markerImage(), await greyImage(400, 300), await markerImage()]);
    await expect(page.locator('canvas')).toBeVisible();
    const file = await download(page, () => page.getByRole('button', { name: 'Download collage' }).click());
    expect(file.name).toBe('collage.jpg');
    const meta = await sharp(file.bytes).metadata();
    expect([meta.width, meta.height]).toEqual([2400, 2400]);
  });

  test('needs two photos', async ({ page }) => {
    await page.goto('/image/collage');
    await page.setInputFiles('input[type=file]', await markerImage());
    await expect(page.getByRole('button', { name: 'Download collage' })).toBeDisabled();
  });
});

test.describe('GIF maker', () => {
  test('makes an animated GIF with every frame', async ({ page }) => {
    await page.goto('/image/gif');
    await page.setInputFiles('input[type=file]', [await markerImage(), await greyImage(300, 200), await markerImage()]);
    await page.getByRole('button', { name: 'Make GIF' }).click();
    await expect(page.getByAltText('Your animated GIF')).toBeVisible();
    const file = await download(page, () => page.getByRole('button', { name: 'Download GIF' }).click());
    expect(file.name).toBe('animation.gif');
    expect(file.bytes.subarray(0, 6).toString()).toBe('GIF89a');
    const meta = await sharp(file.bytes, { animated: true }).metadata();
    expect(meta.pages).toBe(3);
    expect(meta.width).toBe(300);
  });
});

test.describe('passport photo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image/passport');
    await page.setInputFiles('input[type=file]', await greyImage(800, 1000));
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('a single photo is exactly the chosen size at 300 dpi', async ({ page }) => {
    const file = await download(page, () => page.getByRole('button', { name: 'Download photo' }).click());
    expect(file.name).toBe('grey-35x45mm.jpg');
    const meta = await sharp(file.bytes).metadata();
    expect([meta.width, meta.height]).toEqual([413, 531]);
  });

  test('a 4×6 sheet holds eight photos of 35×45 mm', async ({ page }) => {
    await page.getByRole('radio', { name: '4×6 in' }).click();
    await expect(page.getByText('8 photos per sheet')).toBeVisible();
    const file = await download(page, () => page.getByRole('button', { name: 'Download print sheet' }).click());
    const meta = await sharp(file.bytes).metadata();
    expect([meta.width, meta.height]).toEqual([1800, 1200]);
  });

  test('rejects a silly custom size', async ({ page }) => {
    await page.getByLabel('Country or document').selectOption('custom');
    await page.getByLabel('Width (mm)').fill('5');
    await expect(page.getByText(/Enter sizes between/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download photo' })).toBeDisabled();
  });
});

test.describe('screenshot beautifier', () => {
  test('adds padding around the screenshot and keeps it in the middle', async ({ page }) => {
    await page.goto('/image/beautify');
    await page.setInputFiles('input[type=file]', await markerImage());
    await page.getByRole('radio', { name: 'White' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    expect(file.name).toBe('marker-beautified.png');
    const image = await readPixels(file.bytes);
    // 300×200 plus 8% (24 px) of padding on every side.
    expect([image.width, image.height]).toEqual([348, 248]);
    // The marker's blue is in the middle, white backdrop at the corner.
    expect(image.at(174, 124)).toEqual([0, 0, 255]);
    expect(image.at(2, 2)).toEqual([255, 255, 255]);
  });

  test('a fixed shape makes the picture that shape', async ({ page }) => {
    await page.goto('/image/beautify');
    await page.setInputFiles('input[type=file]', await markerImage());
    await page.getByRole('radio', { name: '1:1' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    const meta = await sharp(file.bytes).metadata();
    expect(meta.width).toBe(meta.height);
  });
});

test.describe('annotate image', () => {
  test.use({ viewport: { width: 1280, height: 1400 } });
  test('a filled rectangle paints those pixels at full resolution', async ({ page }) => {
    await page.goto('/image/annotate');
    await page.setInputFiles('input[type=file]', await greyImage(1200, 800));
    await expect(page.locator('[data-markup-stage]')).toBeVisible();
    await page.getByRole('radio', { name: 'Rectangle' }).click();
    await page.getByLabel('Fill the shape').check();
    const stage = (await page.locator('[data-markup-stage]').boundingBox())!;
    await page.mouse.move(stage.x + stage.width * 0.25, stage.y + stage.height * 0.25);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * 0.75, stage.y + stage.height * 0.75, { steps: 8 });
    await page.mouse.up();
    const file = await download(page, () => page.getByRole('button', { name: /Download with 1 mark/ }).click());
    expect(file.name).toBe('grey-annotated.jpg');
    const image = await readPixels(file.bytes);
    expect([image.width, image.height]).toEqual([1200, 800]);
    const [r, g, b] = image.at(600, 400);
    expect(r).toBeGreaterThan(180);
    expect(g).toBeLessThan(90);
    expect(b).toBeLessThan(90);
    // Outside the box the photo is untouched grey.
    const [r2] = image.at(50, 50);
    expect(Math.abs(r2 - 64)).toBeLessThan(6);
  });

  test('numbered steps count up', async ({ page }) => {
    await page.goto('/image/annotate');
    await page.setInputFiles('input[type=file]', await greyImage(1200, 800));
    await page.getByRole('radio', { name: 'Step' }).click();
    const stage = (await page.locator('[data-markup-stage]').boundingBox())!;
    await page.mouse.click(stage.x + stage.width * 0.3, stage.y + stage.height * 0.5);
    await page.mouse.click(stage.x + stage.width * 0.6, stage.y + stage.height * 0.5);
    await expect(page.getByRole('button', { name: /Download with 2 marks/ })).toBeEnabled();
    await expect(page.locator('[data-markup-stage] svg text', { hasText: '2' })).toHaveCount(1);
  });
});
