
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import CropClient from './CropClient';

export const metadata: Metadata = {
  title: "Crop Image Online - Free Photo Cropper",
  description: "Crop images online with ease. Use smart cropping or manual selection to focus on what matters in your photos.",
  keywords: ["crop image", "photo cropper", "cut image", "smart crop", "image framing", "online image cropper"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/crop",
  }
};

export default function CropPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Smart Cropper",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Smart AI-powered cropping tool to automatically detect subjects and crop images perfectly.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "ratingCount": "340"
        }
      }} />
      <CropClient />
    </>
  );
}
