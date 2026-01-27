import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://micropng.sahilfruitwala.com"), // Replace with your production domain
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
    url: "https://micropng.sahilfruitwala.com", // Replace with production URL
    siteName: "MicroPng",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MicroPng - Professional Image Compression",
    description:
      "Fast, secure, and professional-grade image compression directly in your browser.",
    creator: "@micropng",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png", // Next.js will automatically handle this if icon.png is in public
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
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
