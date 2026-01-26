import React from 'react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="py-12 border-t border-white/10 mt-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
               <div className="bg-primary text-white p-1 rounded-md overflow-hidden flex items-center justify-center">
                   <Image src="/icon.png" alt="MicroPng Logo" width={20} height={20} className="object-contain" />
               </div>
               <span className="text-lg font-bold tracking-tight text-white">MicroPng</span>
            </div>
            <p className="text-gray-500 text-sm">
                Professional-grade image optimization, right in your browser.
            </p>
          </div>

          <div className="flex items-center gap-8">
            <a 
              href="https://github.com/SahilFruitwala/MicroPng" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              GitHub
            </a>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Open Source</span>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} MicroPng. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
