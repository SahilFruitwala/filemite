import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://micropng.sahilfruitwala.com"), 
  title: {
    default: "MicroPng - Professional Image Compression",
    template: "%s | MicroPng",
  },
  description:
    "Fast, secure, and professional-grade image compression directly in your browser. Lossless optimization for PNG, JPEG, and WebP.",
  keywords: [
    "image compression",
    "compress png",
    "compress jpeg",
    "optimize images",
    "web performance",
    "local compression",
    "privacy focused",
  ],
  authors: [{ name: "MicroPng Team" }],
  creator: "MicroPng",
  publisher: "MicroPng",
  openGraph: {
    title: "MicroPng - Professional Image Compression",
    description:
      "Fast, secure, and professional-grade image compression directly in your browser.",
    url: "https://micropng.sahilfruitwala.com", 
    siteName: "MicroPng",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph.webp",
        width: 1200,
        height: 630,
        alt: "MicroPng Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MicroPng - Professional Image Compression",
    description:
      "Fast, secure, and professional-grade image compression directly in your browser.",
    creator: "@micropng",
    images: ["/opengraph.webp"],
  },
  icons: {
    icon: "/icon.webp",
    apple: "/icon.webp", 
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "./",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
