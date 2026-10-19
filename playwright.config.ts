import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Browser tests run against the production build (`pnpm build` first), because
 * the Content-Security-Policy and the Nitro server only exist there.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node .output/server/index.mjs',
    url: `http://localhost:${PORT}/api/health`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium refuses to start as root without this (containers, some CI images).
        launchOptions: { args: process.getuid?.() === 0 ? ['--no-sandbox'] : [] },
      },
    },
  ],
});
