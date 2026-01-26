import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0e14]/80 backdrop-blur-md border-b border-white/10">
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary text-white p-1 rounded-md overflow-hidden flex items-center justify-center">
           <Image src="/icon.png" alt="MicroPng Logo" width={24} height={24} className="object-contain" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">MicroPng</span>
      </Link>

      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
        <Link 
            href="/" 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                pathname === '/' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            Compress
        </Link>
        <Link 
            href="/convert" 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                pathname === '/convert' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            Convert
        </Link>
        <Link 
            href="/favicon" 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                pathname === '/favicon' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            Favicon
        </Link>
        <Link 
            href="/scrub" 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                pathname === '/scrub' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            Scrub
        </Link>
        <Link 
            href="/palette" 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                pathname === '/palette' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            Palette
        </Link>
        <Link 
            href="/watermark" 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                pathname === '/watermark' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            Watermark
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <a 
          href="https://github.com/SahilFruitwala/MicroPng" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors p-2"
          title="View on GitHub"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
        </a>
      </div>

    </nav>
  );
}
