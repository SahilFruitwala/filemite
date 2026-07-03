import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import GlassClient from '@/tools/GlassClient';

export const Route = createFileRoute('/glass')({
  head: () =>
    seoHead({
      title: 'Glassmorphism Generator - CSS Glass Effect',
      description: 'Design beautiful glassmorphism backgrounds and UI elements. Generate CSS glass effects with blur and transparency controls.',
      keywords: ['glassmorphism generator', 'css glass effect', 'glass ui generator', 'blur background css', 'frosted glass effect', 'css generator'],
      path: '/glass',
    }),
  component: GlassRoute,
});

function GlassRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'Glassmorphism Generator',
          category: 'DeveloperApplication',
          description: 'A tool to generate glassmorphism CSS effects and high-resolution glass-styled images.',
          rating: '4.8',
          ratingCount: '190',
        })}
      />
      <GlassClient />
    </>
  );
}
