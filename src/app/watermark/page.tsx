
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import WatermarkClient from './WatermarkClient';

export const metadata: Metadata = {
  title: "Add Watermark to Image - Protect Your Photos",
  description: "Add text or logo watermarks to your images online. Protect your copyright with customizable watermarking tools.",
  keywords: ["watermark image", "add logo to image", "protect photos", "copyright image", "image branding", "watermark maker"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/watermark",
  }
};

export default function WatermarkPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Watermarker",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Add custom text or logo watermarks to protect your images quickly and securely.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.6",
            "ratingCount": "410"
        }
      }} />
      <WatermarkClient />
    </>
  );
}
