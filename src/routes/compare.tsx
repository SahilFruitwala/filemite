import { createFileRoute } from '@tanstack/react-router';
import { seoHead } from '@/lib/seo';
import ComparePage from '@/tools/ComparePage';

export const Route = createFileRoute('/compare')({
  head: () =>
    seoHead({
      title: 'MicroPng vs TinyPNG - Why Local Compression is Better',
      description:
        'Compare MicroPng with TinyPNG. Discover why local-first image compression offers better privacy, efficiency, and flexibility compared to traditional cloud-based alternatives.',
      keywords: [
        'micropng vs tinypng',
        'image compression comparison',
        'local vs cloud compression',
        'privacy focused image compressor',
      ],
      path: '/compare',
    }),
  component: ComparePage,
});
