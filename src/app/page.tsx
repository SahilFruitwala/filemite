
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "Free Online Image Compressor - PNG, JPEG, WebP",
  description: "Compress images up to 90% without losing quality. Secure client-side and server-side image compression for PNG, JPEG, and WebP formats.",
  keywords: ["image compressor", "compress png", "reduce image size", "optimize images", "lossless compression", "tiny png", "image optimizer"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com",
  },
  openGraph: {
    title: "Free Online Image Compressor - PNG, JPEG, WebP",
    description: "Compress images up to 90% without losing quality. Secure client-side and server-side image compression.",
    images: [{ url: "/opengraph.webp", width: 1200, height: 630, alt: "MicroPng Banner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Image Compressor - PNG, JPEG, WebP",
    description: "Compress images up to 90% without losing quality. Secure client-side and server-side image compression.",
    images: ["/opengraph.webp"],
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
        },
        "screenshot": "https://micropng.sahilfruitwala.com/opengraph.webp"
      }} />
      <HomeClient />
    </>
  );
}
