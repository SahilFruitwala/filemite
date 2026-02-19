
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import CliClient from './CliClient';

export const metadata: Metadata = {
  title: "MicroPng CLI - High Performance Image Compression",
  description: "A high-performance, local-first CLI image compressor built with Node.js and libvips. Perfect for recursive image optimization in your terminal.",
  keywords: [
    "micropng cli", 
    "image compression cli", 
    "command line image optimizer", 
    "recursive image compressor", 
    "local first compression",
    "png optimization",
    "jpeg optimization",
    "webp optimization",
    "avif optimization"
  ],
  alternates: {
    canonical: "/cli",
  },
  openGraph: {
    title: "MicroPng CLI - Professional Command Line Image Optimization",
    description: "Recursive, blazing-fast, and local-first image compression for your terminal. Supports PNG, JPEG, WebP, and AVIF.",
    url: "https://micropng.sahilfruitwala.com/cli",
    type: "website",
    images: [
      {
        url: "/icon.webp",
        width: 1200,
        height: 630,
        alt: "MicroPng CLI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MicroPng CLI | Terminal-based Image Optimizer",
    description: "High-performance recursive image compression. Zero-data transfer, purely local processing.",
    images: ["/icon.webp"],
  },
};

export default function CliPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": "https://micropng.sahilfruitwala.com/cli#software",
        "name": "MicroPng CLI",
        "alternateName": "micropng-cli",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Windows, macOS, Linux",
        "softwareVersion": "1.0.0",
        "description": "A high-performance, local-first CLI image compressor built with Node.js and libvips. Designed for developers who need fast, reliable, and recursive image optimization.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "author": {
          "@type": "Person",
          "name": "Sahil Fruitwala",
          "url": "https://github.com/SahilFruitwala"
        },
        "downloadUrl": "https://www.npmjs.com/package/micropng-cli",
        "featureList": [
          "Recursive directory scanning",
          "Atomic overwrites",
          "Lossless and lossy compression",
          "Format conversion (WebP, AVIF, JPEG, PNG)",
          "Parallel processing",
          "Metadata preservation"
        ],
        "screenshot": "https://micropng.sahilfruitwala.com/icon.webp"
      }} />
      <CliClient />
    </>
  );
}
