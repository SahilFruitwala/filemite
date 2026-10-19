import { expect, test } from '@playwright/test';

import { describePdf, greyImage, markerImage, samplePdf } from './fixtures';

const PAGES = [
  '/',
  '/image/compress',
  '/image/resize',
  '/image/crop',
  '/image/rotate',
  '/image/redact',
  '/image/watermark',
  '/image/scrub',
  '/image/palette',
  '/image/favicon',
  '/pdf/merge',
  '/pdf/split',
  '/pdf/extract',
  '/pdf/organize',
  '/pdf/compress',
  '/privacy',
  '/terms',
];

/** Records CSP violations and console errors, which the policy would otherwise hide in devtools. */
async function watchForProblems(page: import('@playwright/test').Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  return problems;
}

test('every page is served with the security headers', async ({ request }) => {
  for (const path of PAGES) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const csp = response.headers()['content-security-policy'];
    expect(csp, path).toContain("object-src 'none'");
    expect(response.headers()['x-content-type-options'], path).toBe('nosniff');
  }
});

test('every page loads without errors or CSP violations', async ({ page }) => {
  const problems = await watchForProblems(page);
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(problems).toEqual([]);
});

test('tools that use workers, WASM, blobs and canvas run under the policy', async ({ page }) => {
  const problems = await watchForProblems(page);

  // PDF engine: worker + WASM + blob thumbnails + download.
  await page.goto('/pdf/organize');
  await page.setInputFiles('input[type=file]', samplePdf());
  await expect(page.getByLabel(/^Page 3, position 3/)).toBeVisible();
  await page.getByLabel('Rotate page 1 right').click();
  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByRole('button', { name: 'Save PDF' }).click();
      await page.getByRole('button', { name: 'Download', exact: true }).click();
    })(),
  ]);
  const saved = describePdf(Buffer.from(await (await import('node:fs/promises')).readFile((await pdf.path())!)));
  expect(saved[0].rotate).toBe(90);

  // Canvas export and the server upload path.
  await page.goto('/image/rotate');
  await page.setInputFiles('input[type=file]', await markerImage());
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download image' }).click(),
  ]);

  await page.goto('/image/compress');
  await page.setInputFiles('input[type=file]', await greyImage(600, 400));
  await expect(page.getByText(/KB/).first()).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(problems).toEqual([]);
});
