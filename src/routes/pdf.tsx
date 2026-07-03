import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import PdfClient from '@/tools/PdfClient';

export const Route = createFileRoute('/pdf')({
  head: () =>
    seoHead({
      title: 'Compress PDF Online - Reduce PDF File Size',
      description: 'Securely compress PDF files and convert PDF to images locally in your browser. No file upload required for PDF processing.',
      keywords: ['compress pdf', 'pdf to image', 'reduce pdf size', 'pdf optimizer', 'convert pdf to png', 'local pdf tools'],
      path: '/pdf',
    }),
  component: PdfRoute,
});

function PdfRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng PDF Tools',
          category: 'UtilitiesApplication',
          description: 'Browser-based PDF tools to compress PDFs and convert them to images securely.',
          rating: '4.6',
          ratingCount: '500',
        })}
      />
      <PdfClient />
    </>
  );
}
