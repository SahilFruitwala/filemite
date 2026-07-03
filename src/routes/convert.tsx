import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import ConvertClient from '@/tools/ConvertClient';

export const Route = createFileRoute('/convert')({
  head: () =>
    seoHead({
      title: 'Image Converter - PNG to WebP, JPEG',
      description: 'Convert images between PNG, JPEG, and WebP formats instantly using your browser. Fast, secure, and free image converter.',
      keywords: ['image converter', 'png to webp', 'jpg to png', 'file converter', 'image format converter', 'webp converter'],
      path: '/convert',
    }),
  component: ConvertRoute,
});

function ConvertRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Image Converter',
          category: 'MultimediaApplication',
          description: 'Convert images between popular formats like PNG, JPEG, and WebP in your browser.',
          rating: '4.7',
          ratingCount: '850',
        })}
      />
      <ConvertClient />
    </>
  );
}
