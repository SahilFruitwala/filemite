import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0e14]/80 backdrop-blur-md border-b border-white/10">
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary text-white p-1 rounded-md">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
           </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">ImageCompress</span>
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
      </div>

    </nav>
  );
}
