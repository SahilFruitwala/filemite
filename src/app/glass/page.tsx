
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import GlassClient from './GlassClient';

export const metadata: Metadata = {
  title: "Glassmorphism Generator - CSS Glass Effect",
  description: "Design beautiful glassmorphism backgrounds and UI elements. Generate CSS glass effects with blur and transparency controls.",
  keywords: ["glassmorphism generator", "css glass effect", "glass ui generator", "blur background css", "frosted glass effect", "css generator"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/glass",
  }
};

export default function GlassPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Glassmorphism Generator",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "A tool to generate glassmorphism CSS effects and high-resolution glass-styled images.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "190"
        }
      }} />
      <GlassClient />
    </>
  );
}
