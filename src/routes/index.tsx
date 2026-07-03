import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import HomeClient from '@/tools/HomeClient';

export const Route = createFileRoute('/')({
  head: () =>
    seoHead({
      title: 'Free Online Image Compressor - PNG, JPEG, WebP',
      description: 'Compress images up to 90% without losing quality. Secure client-side and server-side image compression for PNG, JPEG, and WebP formats.',
      keywords: ['image compressor', 'compress png', 'reduce image size', 'optimize images', 'lossless compression', 'tiny png', 'image optimizer'],
      path: '/',
    }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Image Compressor',
          category: 'MultimediaApplication',
          description: 'Professional-grade image compression directly in your browser. Supports PNG, JPEG, and WebP.',
          rating: '4.8',
          ratingCount: '1250',
        })}
      />
      <HomeClient />
    </>
  );
}
