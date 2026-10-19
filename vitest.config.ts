import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Kept separate from vite.config.ts so tests don't load the TanStack Start and
// Nitro plugins; only the `@` alias is shared.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // MuPDF and Sharp load native/WASM code on first use.
    testTimeout: 20_000,
  },
});
