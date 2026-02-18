
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import ResizeClient from './ResizeClient';

export const metadata: Metadata = {
  title: "Resize Image Online - Change Dimensions",
  description: "Resize images to specific dimensions or percentages. Perfect for social media, web, and printing requirements with high quality output.",
  keywords: ["resize image", "change image resolution", "social media image resizer", "scale image", "image dimensions", "photo resizer"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/resize",
  }
};

export default function ResizePage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Image Resizer",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Resize your images to exact pixel dimensions for social media and web use.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.7",
            "ratingCount": "920"
        }
      }} />
      <ResizeClient />
    </>
  );
}
