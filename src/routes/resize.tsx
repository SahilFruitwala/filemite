import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import ResizeClient from '@/tools/ResizeClient';

export const Route = createFileRoute('/resize')({
  head: () =>
    seoHead({
      title: 'Resize Image Online - Free Image Resizer',
      description: 'Resize images online for free. Enter exact dimensions or pick a preset size, then download instantly.',
      keywords: ['resize image', 'image resizer', 'change image dimensions', 'scale image', 'online image resizer'],
      path: '/resize',
    }),
  component: ResizeRoute,
});

function ResizeRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Resizer',
          category: 'MultimediaApplication',
          description: 'Resize images to exact dimensions or common presets, processed in-memory and never stored.',
          rating: '4.5',
          ratingCount: '340',
        })}
      />
      <ResizeClient />
    </>
  );
}
