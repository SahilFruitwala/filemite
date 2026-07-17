# MicroPNG

High-performance image compression and toolkit built with TanStack Start. Compress, crop, scrub EXIF, extract palettes, and generate favicons — processed in-memory on the server and never stored.

## Features

- **Smart compression** — Best / Balanced / Small presets for PNG, JPEG, WebP (HEIC input supported)
- **Bulk upload** — process multiple images with concurrent server jobs
- **Crop, scrub, palette, favicon** — focused tools around the same pipeline
- **Privacy** — images are processed in-memory; nothing is persisted

## Tech stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Vite + TanStack Router)
- **Design system**: [Astryx](https://www.npmjs.com/package/@astryxdesign/core) + custom MicroPNG theme
- **Styling**: Tailwind CSS 4
- **Image backend**: [Sharp](https://sharp.pixelplumbing.com/) (libvips) on Node serverless
- **Deploy**: [Vercel](https://vercel.com/) (Nitro `vercel` preset)

## Getting started

Prerequisites: Node.js 20+

```bash
bun install   # or npm install
bun run dev   # http://localhost:3000
```

## Deploy on Vercel

```bash
bun run build
# or connect the repo in the Vercel dashboard — Nitro emits a Vercel output
```

Sharp requires the **Node.js** runtime (not Edge). Body size is capped at ~4MB to stay within Vercel serverless request limits.

## Privacy

Images are processed in-memory and discarded when the request completes. See [/privacy](/privacy).

## License

MIT — see [LICENSE](LICENSE).
