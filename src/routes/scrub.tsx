import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import ScrubClient from '@/tools/ScrubClient';

export const Route = createFileRoute('/scrub')({
  head: () =>
    seoHead({
      title: 'Remove Image Metadata - Exif Cleaner',
      description: 'Protect your privacy by removing hidden metadata (EXIF, GPS, Camera settings) from your photos before sharing them online.',
      keywords: ['remove image metadata', 'exif cleaner', 'remove gps from photo', 'privacy tool', 'scrub image', 'metadata remover'],
      path: '/scrub',
    }),
  component: ScrubRoute,
});

function ScrubRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Metadata Scrubber',
          category: 'UtilityApplication',
          description: 'Remove sensitive metadata from images to protect your privacy.',
          rating: '4.9',
          ratingCount: '250',
        })}
      />
      <ScrubClient />
    </>
  );
}
