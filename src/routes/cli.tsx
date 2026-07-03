import { createFileRoute } from '@tanstack/react-router';
import JsonLd from '@/components/JsonLd';
import { seoHead, softwareAppJsonLd } from '@/lib/seo';
import CliClient from '@/tools/CliClient';

export const Route = createFileRoute('/cli')({
  head: () =>
    seoHead({
      title: 'MicroPng CLI - High Performance Image Compression',
      description: 'A high-performance, local-first CLI image compressor built with Node.js and libvips. Perfect for recursive image optimization in your terminal.',
      keywords: ['micropng cli', 'image compression cli', 'command line image optimizer', 'recursive image compressor', 'local first compression'],
      path: '/cli',
    }),
  component: CliRoute,
});

function CliRoute() {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: 'MicroPng CLI',
          category: 'MultimediaApplication',
          description: 'A high-performance, local-first CLI image compressor built with Node.js and libvips. Designed for developers who need fast, reliable, and recursive image optimization.',
        })}
      />
      <CliClient />
    </>
  );
}
