import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { describePdf, samplePdf } from './fixtures';

const cards = (page: import('@playwright/test').Page) =>
  page.locator('[aria-label^="Page "][aria-label*="position"]');
const order = async (page: import('@playwright/test').Page) =>
  (await cards(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')!.split('.')[0])));

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf/organize');
  await page.setInputFiles('input[type=file]', samplePdf());
  await expect(cards(page)).toHaveCount(3);
});

test('save is disabled until something changes', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeDisabled();
  await page.getByLabel('Rotate page 2 left').click();
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeEnabled();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeDisabled();
});

test('reverses and rotates, and the saved PDF matches', async ({ page }) => {
  await page.getByLabel('Rotate page 1 right').click();
  await page.getByRole('button', { name: 'Reverse' }).click();
  expect(await order(page)).toEqual([
    'Page 3, position 1',
    'Page 2, position 2',
    'Page 1, position 3, rotated 90 degrees',
  ]);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByRole('button', { name: 'Save PDF' }).click();
      await page.getByRole('button', { name: 'Download', exact: true }).click();
    })(),
  ]);
  expect(download.suggestedFilename()).toBe('sample-organized.pdf');
  const pages = describePdf(await readFile((await download.path())!));
  // Widths: page 3 is 400 wide, page 2 is 350, page 1 is 300 wide but turned on its side (400 tall).
  expect(pages).toEqual([
    { width: 400, rotate: 0 },
    { width: 350, rotate: 0 },
    { width: 400, rotate: 90 },
  ]);
});

test('drag and keyboard both reorder pages', async ({ page }) => {
  const first = await cards(page).nth(0).boundingBox();
  const last = await cards(page).nth(2).boundingBox();
  await page.mouse.move(first!.x + first!.width / 2, first!.y + first!.height / 2);
  await page.mouse.down();
  await page.mouse.move(first!.x + first!.width / 2 + 20, first!.y + first!.height / 2, { steps: 5 });
  await page.mouse.move(last!.x + last!.width / 2, last!.y + last!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => order(page)).toEqual([
    'Page 2, position 1',
    'Page 3, position 2',
    'Page 1, position 3',
  ]);

  await page.getByRole('button', { name: 'Reset' }).click();
  await cards(page).nth(0).focus();
  // dnd-kit needs a frame between key presses.
  for (const key of ['Space', 'ArrowRight', 'Space']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
  }
  await expect.poll(() => order(page)).toEqual([
    'Page 2, position 1',
    'Page 1, position 2',
    'Page 3, position 3',
  ]);
});
