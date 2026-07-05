import { build } from 'esbuild';
import { injectManifest } from 'workbox-build';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, '.output/public');
const swSrc = path.join(root, 'src/sw.ts');
const swDest = path.join(publicDir, 'sw.js');

const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'micropng-sw-'));
const bundledSw = path.join(tmpDir, 'sw-bundled.js');

try {
  await build({
    entryPoints: [swSrc],
    outfile: bundledSw,
    format: 'esm',
    target: 'es2022',
    bundle: true,
    minify: true,
    logLevel: 'silent',
  });

  const { count, size, warnings } = await injectManifest({
    swSrc: bundledSw,
    swDest,
    globDirectory: publicDir,
    globPatterns: ['**/*.{js,css,woff2,webp,png,ico,wasm}'],
    globIgnores: ['**/sw.js', '**/test-image.jpg'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  });

  for (const warning of warnings) {
    console.warn(warning);
  }

  console.log(`Generated ${swDest} with ${count} precached files (${size} bytes).`);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
