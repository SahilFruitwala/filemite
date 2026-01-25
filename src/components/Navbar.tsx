import Link from 'next/link';
import React from 'react';
export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0e14]/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="bg-primary text-white p-1 rounded-md">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
           </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">ImageCompress</span>
      </div>




    </nav>
  );
}
