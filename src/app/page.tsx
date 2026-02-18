
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "Free Online Image Compressor - PNG, JPEG, WebP",
  description: "Compress images up to 90% without losing quality. Secure client-side and server-side image compression for PNG, JPEG, and WebP formats.",
  keywords: ["image compressor", "compress png", "reduce image size", "optimize images", "lossless compression", "tiny png", "image optimizer"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com",
  }
};

export default function Home() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Image Compressor",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": "Professional-grade image compression directly in your browser. Supports PNG, JPEG, and WebP.",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "1250"
        }
      }} />
      <HomeClient />
    </>
  );
}
