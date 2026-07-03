import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import TracerClient from '@/tools/TracerClient';

export const Route = createFileRoute('/tracer')({
  head: () =>
    seoHead({
      title: 'Image Tracer - Convert Bitmap to SVG',
      description: 'Convert raster images (PNG, JPG) to scalable vector graphics (SVG). Free online image tracer and vectorizer.',
      keywords: ['image tracer', 'bitmap to svg', 'convert image to vector', 'svg converter', 'vectorizer', 'png to svg'],
      path: '/tracer',
    }),
  component: TracerRoute,
});

function TracerRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Image Tracer',
          category: 'DesignApplication',
          description: 'Convert raster images to SVG vectors automatically using client-side tracing.',
          rating: '4.3',
          ratingCount: '120',
        })}
      />
      <TracerClient />
    </>
  );
}
