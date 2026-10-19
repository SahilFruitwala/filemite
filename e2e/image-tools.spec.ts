import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { greyImage, markerImage, readPixels } from './fixtures';

async function download(page: Page, action: () => Promise<void>) {
  const [file] = await Promise.all([page.waitForEvent('download'), action()]);
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

const isRed = ([r, g, b]: readonly number[]) => r > 200 && g < 60 && b < 60;

test.describe('rotate & flip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image/rotate');
    await page.setInputFiles('input[type=file]', await markerImage());
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('download is disabled until the image is changed', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Download image' })).toBeDisabled();
  });

  test('rotating right moves the top-left corner to the top-right, at full size', async ({ page }) => {
    await page.getByRole('button', { name: 'Rotate right' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    expect(file.name).toBe('marker-rotated.png');
    const image = await readPixels(file.bytes);
    expect([image.width, image.height]).toEqual([200, 300]);
    expect(isRed(image.at(image.width - 6, 5))).toBe(true);
    expect(isRed(image.at(5, 5))).toBe(false);
  });

  test('flips apply to what you see, so order matters', async ({ page }) => {
    await page.getByRole('button', { name: 'Rotate right' }).click();
    await page.getByRole('button', { name: 'Flip horizontal' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    const image = await readPixels(file.bytes);
    expect(isRed(image.at(5, 5))).toBe(true);
  });
});

test.describe('blur & redact', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image/redact');
    await page.setInputFiles('input[type=file]', await greyImage(1200, 800));
    await expect(page.getByLabel(/^Drawing area/)).toBeVisible();
  });

  test('a dragged black box hides exactly those source pixels', async ({ page }) => {
    const area = (await page.getByLabel(/^Drawing area/).boundingBox())!;
    const [x0, y0, x1, y1] = [0.25, 0.3, 0.55, 0.6];
    await page.mouse.move(area.x + area.width * x0, area.y + area.height * y0);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width * x1, area.y + area.height * y1, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByText(/1 area/)).toBeVisible();

    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    expect(file.name).toBe('grey-redacted.jpg');
    const image = await readPixels(file.bytes);
    expect(image.at(300 + 10, 240 + 10)[0]).toBeLessThan(10); // inside → black
    expect(image.at(1200 * 0.55 + 20, 240 + 10)[0]).toBeGreaterThan(50); // outside → grey
    expect(image.at(10, 10)[0]).toBeGreaterThan(50);
  });

  test('tiny drags are ignored instead of leaving invisible boxes', async ({ page }) => {
    const area = (await page.getByLabel(/^Drawing area/).boundingBox())!;
    await page.mouse.move(area.x + 50, area.y + 50);
    await page.mouse.down();
    await page.mouse.move(area.x + 52, area.y + 52);
    await page.mouse.up();
    await expect(page.getByText('None yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download image' })).toBeDisabled();
  });

  test('can be done entirely from the keyboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Add box' }).click();
    const box = page.getByRole('group', { name: /^Hidden area 1 of 1/ });
    await expect(box).toBeFocused();

    const before = (await box.boundingBox())!;
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    const after = (await box.boundingBox())!;
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.height).toBeGreaterThan(before.height);

    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    const image = await readPixels(file.bytes);
    expect(image.at(600, 400)[0]).toBeLessThan(10); // the centred box covers the middle

    await box.focus(); // downloading moved focus to the button
    await page.keyboard.press('Delete');
    await expect(page.getByText('None yet')).toBeVisible();
  });

  test('undo removes the last box', async ({ page }) => {
    await page.getByRole('button', { name: 'Add box' }).click();
    await page.getByRole('button', { name: 'Add box' }).click();
    await expect(page.getByText(/2 areas/)).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText(/1 area/)).toBeVisible();
  });
});

test.describe('watermark', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image/watermark');
    await page.setInputFiles('input[type=file]', await greyImage(1200, 800));
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('stamps text in the bottom-right corner at the chosen size', async ({ page }) => {
    await page.getByPlaceholder('© Your name').fill('SAMPLE MARK');
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    expect(file.name).toBe('grey-watermarked.jpg');
    const image = await readPixels(file.bytes);

    let minX = image.width;
    let maxX = 0;
    let lightInTopLeft = 0;
    for (let y = 0; y < image.height; y += 2) {
      for (let x = 0; x < image.width; x += 2) {
        if (image.at(x, y)[0] > 100) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          if (x < image.width / 2 && y < image.height / 2) lightInTopLeft++;
        }
      }
    }
    expect(lightInTopLeft).toBe(0);
    const widthPercent = ((maxX - minX) / image.width) * 100;
    expect(widthPercent).toBeGreaterThan(27);
    expect(widthPercent).toBeLessThan(32);
  });

  test('tiling covers every quadrant', async ({ page }) => {
    await page.getByLabel('Repeat across the image').check();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    const image = await readPixels(file.bytes);
    const seen = [false, false, false, false];
    for (let y = 0; y < image.height; y += 3) {
      for (let x = 0; x < image.width; x += 3) {
        if (image.at(x, y)[0] > 100) seen[(y >= image.height / 2 ? 2 : 0) + (x >= image.width / 2 ? 1 : 0)] = true;
      }
    }
    expect(seen).toEqual([true, true, true, true]);
  });

  test('explains why download is disabled', async ({ page }) => {
    await page.getByPlaceholder('© Your name').fill('');
    await expect(page.getByRole('button', { name: 'Download image' })).toBeDisabled();
    await expect(page.getByText('Type the watermark text.')).toBeVisible();
    await page.getByRole('radio', { name: 'Logo' }).click();
    await expect(page.getByText('Choose a logo first.')).toBeVisible();
  });
});
