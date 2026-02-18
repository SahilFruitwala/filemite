
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import ScrubClient from './ScrubClient';

export const metadata: Metadata = {
  title: "Remove Image Metadata - Exif Cleaner",
  description: "Protect your privacy by removing hidden metadata (EXIF, GPS, Camera settings) from your photos before sharing them online.",
  keywords: ["remove image metadata", "exif cleaner", "remove gps from photo", "privacy tool", "scrub image", "metadata remover"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/scrub",
  }
};

export default function ScrubPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Metadata Scrubber",
        "applicationCategory": "UtilityApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Remove sensitive metadata from images to protect your privacy.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "250"
        }
      }} />
      <ScrubClient />
    </>
  );
}
