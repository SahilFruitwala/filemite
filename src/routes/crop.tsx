import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import CropClient from '@/tools/CropClient';

export const Route = createFileRoute('/crop')({
  head: () =>
    seoHead({
      title: 'Crop Image Online - Free Photo Cropper',
      description: 'Crop images online with ease. Use smart cropping or manual selection to focus on what matters in your photos.',
      keywords: ['crop image', 'photo cropper', 'cut image', 'smart crop', 'image framing', 'online image cropper'],
      path: '/crop',
    }),
  component: CropRoute,
});

function CropRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Smart Cropper',
          category: 'MultimediaApplication',
          description: 'Smart AI-powered cropping tool to automatically detect subjects and crop images perfectly.',
          rating: '4.5',
          ratingCount: '340',
        })}
      />
      <CropClient />
    </>
  );
}
