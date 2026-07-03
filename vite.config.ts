import { defineConfig, type Plugin } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

// Inline `*.wasm?base64` imports as a base64 string baked into the bundle.
// Server-side wasm codecs (@jsquash/*) can't rely on emitted asset files —
// they aren't reachable from the client graph, so no build copies them. Baking
// the bytes in keeps the server self-contained and portable to any host.
function wasmBase64(): Plugin {
  const SUFFIX = '?base64';
  return {
    name: 'wasm-base64',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith('.wasm' + SUFFIX)) return null;
      const resolved = await this.resolve(source.slice(0, -SUFFIX.length), importer, { skipSelf: true });
      return resolved ? resolved.id + SUFFIX : null;
    },
    async load(id) {
      if (!id.endsWith('.wasm' + SUFFIX)) return null;
      const buf = await readFile(id.slice(0, -SUFFIX.length));
      return `export default ${JSON.stringify(buf.toString('base64'))};`;
    },
  };
}

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    wasmBase64(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
});
