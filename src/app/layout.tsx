import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ImageCompress - Lossless Optimization',
  description: 'Fast, secure, and professional-grade image compression directly in your browser.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
