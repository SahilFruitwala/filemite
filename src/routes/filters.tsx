import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import FiltersClient from '@/tools/FiltersClient';

export const Route = createFileRoute('/filters')({
  head: () =>
    seoHead({
      title: 'Photo Filters Online - Aesthetic Image Effects',
      description: 'Apply aesthetic filters to your photos online. Vintage, noir, breezy, and more effects to enhance your images instantly.',
      keywords: ['photo filters', 'image effects', 'instagram filters online', 'vintage photo filter', 'black and white filter', 'picture editor'],
      path: '/filters',
    }),
  component: FiltersRoute,
});

function FiltersRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng Photo Filters',
          category: 'MultimediaApplication',
          description: 'Apply professional grade filters and effects to your images directly in the browser.',
          rating: '4.4',
          ratingCount: '210',
        })}
      />
      <FiltersClient />
    </>
  );
}
