import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  server: { port: 3000 },
  build: { cssMinify: 'esbuild' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
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
