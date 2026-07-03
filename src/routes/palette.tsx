import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import PaletteClient from '@/tools/PaletteClient';

export const Route = createFileRoute('/palette')({
  head: () =>
    seoHead({
      title: 'Color Palette Generator - Extract Colors from Image',
      description: 'Upload an image to instantly generate a color palette. Extract dominant colors and get HEX codes for your design projects.',
      keywords: ['color palette generator', 'extract colors from image', 'image color picker', 'hex code extractor', 'design palette'],
      path: '/palette',
    }),
  component: PaletteRoute,
});

function PaletteRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Palette Generator',
          category: 'DesignApplication',
          description: 'Extract dominant color palettes from any image instantly in your browser.',
          rating: '4.6',
          ratingCount: '150',
        })}
      />
      <PaletteClient />
    </>
  );
}
