import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  server: { port: 3000 },
  build: { cssMinify: 'esbuild', target: 'es2022' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // MuPDF and mozjpeg ship their own WASM loaders that locate the .wasm file
  // via import.meta.url; pre-bundling would break that path.
  optimizeDeps: {
    exclude: ['mupdf', '@jsquash/jpeg'],
  },
  worker: {
    format: 'es',
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    // Node serverless on Vercel — Sharp needs the Node runtime, not Edge.
    nitro({
      preset: process.env.VERCEL ? 'vercel' : undefined,
    }),
    viteReact(),
  ],
  ssr: {
    external: ['sharp'],
  },
});
