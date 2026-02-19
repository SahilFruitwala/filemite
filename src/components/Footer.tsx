import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Github, Heart, ShieldCheck, Zap, Terminal } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 border-t border-border mt-20 relative bg-muted/10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-sm">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 space-y-4">
             <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center border border-border shadow-sm">
                    <Image src="/icon.png" alt="MicroPng Logo" width={32} height={32} className="object-contain" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">MicroPng</span>
             </div>
             <p className="text-muted-foreground leading-relaxed max-w-sm">
                Professional image optimization in your browser. <br/>
                No server uploads. No compromises.
             </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
             <h4 className="font-semibold text-foreground">Tools</h4>
             <div className="flex flex-col gap-2">
                 <Link href="/convert" className="text-muted-foreground hover:text-primary transition-colors">Convert</Link>
                 <Link href="/resize" className="text-muted-foreground hover:text-primary transition-colors">Resize</Link>
                 <Link href="/compress" className="text-muted-foreground hover:text-primary transition-colors">Compress</Link>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="font-semibold text-foreground">Legal & Code</h4>
             <div className="flex flex-col gap-2">
                 <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
                 <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link>
                 <Link href="/cli" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 focus-visible:outline-none">
                    <Terminal size={12} />
                    CLI Tool
                 </Link>
                 <a href="https://github.com/SahilFruitwala/micropng" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">GitHub</a>
             </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Sahil Fruitwala. MIT Licensed.
          </p>
          <div className="flex items-center gap-2">
             <span>Made with</span>
             <Heart size={12} className="text-destructive fill-destructive" />
             <span>and 🍊 using Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
