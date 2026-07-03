import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import ResizeClient from '@/tools/ResizeClient';

export const Route = createFileRoute('/resize')({
  head: () =>
    seoHead({
      title: 'Resize Image Online - Change Dimensions',
      description: 'Resize images to specific dimensions or percentages. Perfect for social media, web, and printing requirements with high quality output.',
      keywords: ['resize image', 'change image resolution', 'social media image resizer', 'scale image', 'image dimensions', 'photo resizer'],
      path: '/resize',
    }),
  component: ResizeRoute,
});

function ResizeRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Image Resizer',
          category: 'MultimediaApplication',
          description: 'Resize your images to exact pixel dimensions for social media and web use.',
          rating: '4.7',
          ratingCount: '920',
        })}
      />
      <ResizeClient />
    </>
  );
}
