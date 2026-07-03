import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import WatermarkClient from '@/tools/WatermarkClient';

export const Route = createFileRoute('/watermark')({
  head: () =>
    seoHead({
      title: 'Add Watermark to Image - Protect Your Photos',
      description: 'Add text or logo watermarks to your images online. Protect your copyright with customizable watermarking tools.',
      keywords: ['watermark image', 'add logo to image', 'protect photos', 'copyright image', 'image branding', 'watermark maker'],
      path: '/watermark',
    }),
  component: WatermarkRoute,
});

function WatermarkRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Watermarker',
          category: 'MultimediaApplication',
          description: 'Add custom text or logo watermarks to protect your images quickly and securely.',
          rating: '4.6',
          ratingCount: '410',
        })}
      />
      <WatermarkClient />
    </>
  );
}
