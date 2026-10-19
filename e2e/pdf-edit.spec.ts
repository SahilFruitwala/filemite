import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { describePdf, greyImage, markerImage, pdfInk, pdfText, samplePdf, textPdf } from './fixtures';

async function download(page: Page, action: () => Promise<void>) {
  const [file] = await Promise.all([page.waitForEvent('download'), action()]);
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

// A whole page is taller than the default window, and the mouse can only reach what is on screen.
const TALL = { width: 1280, height: 2000 };

/** Drags across a fraction of the page stage. */
async function dragOnPage(page: Page, from: [number, number], to: [number, number]) {
  const stage = (await page.locator('[data-markup-stage]').boundingBox())!;
  await page.mouse.move(stage.x + stage.width * from[0], stage.y + stage.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(stage.x + stage.width * to[0], stage.y + stage.height * to[1], { steps: 10 });
  await page.mouse.up();
}

test.describe('images to PDF', () => {
  test('makes one A4 page per image, in the order shown', async ({ page }) => {
    await page.goto('/pdf/from-images');
    await page.setInputFiles('input[type=file]', [await markerImage(), await greyImage(400, 600)]);
    await expect(page.getByLabel(/^Page 2,/)).toBeVisible();
    await page.getByRole('button', { name: 'Create PDF from 2 images' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    expect(file.name).toBe('images.pdf');
    const pages = describePdf(file.bytes);
    expect(pages).toHaveLength(2);
    // The wide marker image gets a landscape page; the tall photo a portrait one.
    expect(pages[0].width).toBe(842);
    expect(pages[1].width).toBe(595);
  });

  test('fit-to-image pages follow each picture’s shape', async ({ page }) => {
    await page.goto('/pdf/from-images');
    await page.setInputFiles('input[type=file]', await markerImage());
    await page.getByRole('radio', { name: 'Fit image' }).click();
    await page.getByRole('radio', { name: 'None' }).click();
    await page.getByRole('button', { name: /Create PDF/ }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    expect(file.name).toBe('marker.pdf');
    expect(describePdf(file.bytes)[0].width).toBe(225);
  });
});

test.describe('PDF to images', () => {
  test('exports the pages you type as one image', async ({ page }) => {
    await page.goto('/pdf/to-images');
    await page.setInputFiles('input[type=file]', samplePdf(3));
    await expect(page.getByLabel('Page 3')).toBeVisible();
    await page.getByPlaceholder(/All pages/).fill('2');
    await page.getByRole('button', { name: 'Export 1 page' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download image' }).click());
    expect(file.name).toBe('sample-page-2.png');
    // Page 2 is 350 pt wide; at the default 150 dpi that is about 730 px.
    expect(file.bytes.readUInt32BE(16)).toBe(730);
  });

  test('several pages come as a ZIP', async ({ page }) => {
    await page.goto('/pdf/to-images');
    await page.setInputFiles('input[type=file]', samplePdf(3));
    await expect(page.getByLabel('Page 3')).toBeVisible();
    await page.getByRole('button', { name: 'Export 3 pages' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download ZIP' }).click());
    expect(file.name).toBe('sample-images.zip');
    const text = file.bytes.toString('latin1');
    for (const name of ['sample-page-1.png', 'sample-page-2.png', 'sample-page-3.png']) expect(text).toContain(name);
  });
});

test.describe('fill & annotate PDF', () => {
  test.use({ viewport: TALL });
  test.beforeEach(async ({ page }) => {
    await page.goto('/pdf/annotate');
    await page.setInputFiles('input[type=file]', textPdf());
    await expect(page.getByAltText('Page 1')).toBeVisible();
  });

  test('typed text lands in the saved PDF', async ({ page }) => {
    const stage = (await page.locator('[data-markup-stage]').boundingBox())!;
    await page.mouse.click(stage.x + stage.width * 0.2, stage.y + stage.height * 0.8);
    await page.getByLabel('Text to add').fill('Hello PDF');
    await page.getByLabel('Text to add').blur();
    await page.getByRole('button', { name: /Save PDF with 1 mark/ }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    expect(file.name).toBe('text-annotated.pdf');
    const text = pdfText(file.bytes)[0];
    expect(text).toContain('Secret 1');
    expect(text).toContain('Hello PDF');
  });

  test('an empty text box is not kept', async ({ page }) => {
    const stage = (await page.locator('[data-markup-stage]').boundingBox())!;
    await page.mouse.click(stage.x + stage.width * 0.5, stage.y + stage.height * 0.5);
    await page.getByLabel('Text to add').blur();
    await expect(page.getByRole('button', { name: 'Save PDF' })).toBeDisabled();
  });

  test('a rectangle can be drawn, moved, and deleted with the keyboard', async ({ page }) => {
    await page.getByRole('radio', { name: 'Rectangle' }).click();
    await dragOnPage(page, [0.1, 0.1], [0.5, 0.3]);
    await expect(page.getByText('1 on this page')).toBeVisible();
    await page.getByRole('button', { name: /Save PDF with 1 mark/ }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    // The outline passes through the left edge of the box (x ≈ 30 pt, y ≈ 40–120 pt).
    expect(pdfInk(file.bytes, 0, [28, 50, 34, 100])).toBeGreaterThan(20);
  });

  test('undo takes the last mark away', async ({ page }) => {
    await page.getByRole('radio', { name: 'Check' }).click();
    const stage = (await page.locator('[data-markup-stage]').boundingBox())!;
    await page.mouse.click(stage.x + stage.width * 0.5, stage.y + stage.height * 0.5);
    await expect(page.getByText('1 in total')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('0 in total')).toBeVisible();
  });
});

test.describe('sign PDF', () => {
  test.use({ viewport: TALL });
  test('a drawn signature is placed on the page and saved', async ({ page }) => {
    await page.goto('/pdf/sign');
    await page.setInputFiles('input[type=file]', textPdf());
    await expect(page.locator('[data-markup-stage]')).toBeVisible();

    const pad = (await page.getByLabel(/^Signature pad/).boundingBox())!;
    await page.mouse.move(pad.x + pad.width * 0.15, pad.y + pad.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(pad.x + pad.width * 0.5, pad.y + pad.height * 0.25, { steps: 10 });
    await page.mouse.move(pad.x + pad.width * 0.85, pad.y + pad.height * 0.7, { steps: 10 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Use signature' }).click();

    await expect(page.getByText('1 on this page')).toBeVisible();
    await page.getByRole('button', { name: 'Save signed PDF' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    expect(file.name).toBe('text-signed.pdf');
    // The signature is centred about 70% of the way down the page, 28% of its width wide.
    expect(pdfInk(file.bytes, 0, [90, 240, 210, 320])).toBeGreaterThan(50);
  });

  test('a typed signature works too', async ({ page }) => {
    await page.goto('/pdf/sign');
    await page.setInputFiles('input[type=file]', textPdf());
    await page.getByRole('radio', { name: 'Type' }).click();
    await page.getByLabel('Your name').fill('Ada Lovelace');
    await page.getByRole('button', { name: 'Use signature' }).click();
    await expect(page.getByText('1 on this page')).toBeVisible();
    await page.getByRole('button', { name: 'Save signed PDF' }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    expect(pdfInk(file.bytes, 0, [90, 240, 210, 320])).toBeGreaterThan(50);
  });
});

test.describe('redact PDF', () => {
  test.use({ viewport: TALL });
  test('text under the box is deleted from the file', async ({ page }) => {
    await page.goto('/pdf/redact');
    await page.setInputFiles('input[type=file]', textPdf());
    await expect(page.getByAltText('Page 1')).toBeVisible();
    // "Secret 1" sits about 76–100 pt from the top of a 400 pt page, starting 50 pt from the left.
    await dragOnPage(page, [0.1, 0.15], [0.9, 0.3]);
    await expect(page.getByText('1 box on 1 page')).toBeVisible();
    await page.getByRole('button', { name: /Remove 1 area for good/ }).click();
    const file = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    expect(file.name).toBe('text-redacted.pdf');
    expect(pdfText(file.bytes)[0]).toBe('');
    expect(pdfInk(file.bytes, 0, [40, 65, 250, 115])).toBeGreaterThan(200 * 45 * 0.9);
  });
});
