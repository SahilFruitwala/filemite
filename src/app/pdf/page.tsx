
import { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import PdfClient from './PdfClient';

export const metadata: Metadata = {
  title: "Compress PDF Online - Reduce PDF File Size",
  description: "Securely compress PDF files and convert PDF to images locally in your browser. No file upload required for PDF processing.",
  keywords: ["compress pdf", "pdf to image", "reduce pdf size", "pdf optimizer", "convert pdf to png", "local pdf tools"],
  alternates: {
    canonical: "https://micropng.sahilfruitwala.com/pdf",
  }
};

export default function PDFPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MicroPng PDF Tools",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Browser-based PDF tools to compress PDFs and convert them to images securely.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.6",
            "ratingCount": "500"
        }
      }} />
      <PdfClient />
    </>
  );
}
