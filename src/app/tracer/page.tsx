
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import TracerClient from './TracerClient';

export const metadata: Metadata = {
  title: "Image Tracer - Convert Bitmap to SVG",
  description: "Convert raster images (PNG, JPG) to scalable vector graphics (SVG). Free online image tracer and vectorizer.",
  keywords: ["image tracer", "bitmap to svg", "convert image to vector", "svg converter", "vectorizer", "png to svg"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/tracer",
  }
};

export default function TracerPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Image Tracer",
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Convert raster images to SVG vectors automatically using client-side tracing.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.3",
            "ratingCount": "120"
        }
      }} />
      <TracerClient />
    </>
  );
}
