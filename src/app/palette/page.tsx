
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import PaletteClient from './PaletteClient';

export const metadata: Metadata = {
  title: "Color Palette Generator - Extract Colors from Image",
  description: "Upload an image to instantly generate a color palette. Extract dominant colors and get HEX codes for your design projects.",
  keywords: ["color palette generator", "extract colors from image", "image color picker", "hex code extractor", "design palette"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/palette",
  }
};

export default function PalettePage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng Palette Generator",
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Extract dominant color palettes from any image instantly in your browser.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.6",
            "ratingCount": "150"
        }
      }} />
      <PaletteClient />
    </>
  );
}
