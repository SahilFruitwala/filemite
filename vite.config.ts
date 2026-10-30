import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  server: { port: 3000 },
  build: { cssMinify: 'lightningcss', target: 'es2022' },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
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
      // Pre-compress static assets at build time so the Node server can answer with
      // Brotli/gzip (Vercel compresses at the edge; self-hosting needs this).
      compressPublicAssets: { gzip: true, brotli: true },
      // The image queue waits up to 20 s for a slot (see src/server/guard.ts), which
      // outlasts Vercel's 10 s default and would surface as a platform 504 instead of
      // our 503 + Retry-After. 60 s is the most a Hobby plan allows.
      vercel: { functions: { maxDuration: 60 } },
    }),
    viteReact(),
  ],
  ssr: {
    external: ['sharp'],
  },
});
