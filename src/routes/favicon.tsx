import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import FaviconClient from '@/tools/FaviconClient';

export const Route = createFileRoute('/favicon')({
  head: () =>
    seoHead({
      title: 'Favicon Generator - Create ICO and PNG Icons',
      description: 'Generate favicons in every size you need. Create ICO files and PNG icons for web, mobile, and desktop from any image.',
      keywords: ['favicon generator', 'ico converter', 'create favicon', 'png to ico', 'apple touch icon', 'website icon'],
      path: '/favicon',
    }),
  component: FaviconRoute,
});

function FaviconRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Favicon Generator',
          category: 'DeveloperApplication',
          description: 'Generate complete favicon sets including ICO files and PNG icons in all standard sizes.',
        })}
      />
      <FaviconClient />
    </>
  );
}
