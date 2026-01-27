import React from 'react';
import Image from 'next/image';
import { Github, Heart, ShieldCheck, Zap, Terminal } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-16 border-t border-border mt-20 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-4">
            <div className="flex items-center gap-2">
               <div className="bg-primary text-white p-1 rounded-md overflow-hidden flex items-center justify-center">
                   <Image src="/icon.png" alt="MicroPng Logo" width={20} height={20} className="object-contain" />
               </div>
               <span className="text-xl font-bold tracking-tight text-white uppercase">MicroPng</span>
            </div>
            <p className="text-muted text-sm text-center lg:text-left leading-relaxed">
                Professional-grade image optimization, right in your browser. Built with a focus on speed, precision, and privacy.
            </p>
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-subtle">
                <Heart size={14} className="text-red-500 fill-red-500" />
                <span>Vibe coded & manually tested</span>
            </div>
          </div>

          {/* Privacy & Handling */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest">
                <ShieldCheck size={18} className="text-primary" />
                Zero Data Retention
            </div>
            <p className="text-subtle text-sm text-center lg:text-left leading-relaxed">
                We value your privacy. We <strong>do not store</strong> any images on our servers. Files are processed in-memory and immediately deleted after delivery.
            </p>
          </div>

          {/* Connect & Contribute */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end gap-6">
            <div className="flex flex-col items-center lg:items-end gap-2">
                <span className="text-xs font-semibold text-subtle uppercase tracking-widest">Resources</span>
                <a href="/compare" className="text-sm text-muted hover:text-white transition-colors">Why MicroPng?</a>
                <a href="/bg-remover" className="text-sm text-gray-400 hover:text-white transition-colors opacity-50 cursor-not-allowed" title="Coming Soon">Background Remover</a>
            </div>

            <div className="flex flex-col items-center lg:items-end gap-2">
                <span className="text-xs font-semibold text-subtle uppercase tracking-widest">Contribute</span>
                <a 
                  href="https://github.com/SahilFruitwala/MicroPng" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 bg-surface hover:bg-surface-hover border border-border px-4 py-2 rounded-2xl text-white transition-all shadow-xl"
                >
                  <Github size={20} />
                  <span className="text-sm font-medium">Improve this tool</span>
                </a>
            </div>
            
            <div className="flex flex-col items-center lg:items-end gap-2 text-center lg:text-right">
                <span className="text-xs font-semibold text-subtle uppercase tracking-widest">Status</span>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live & Open Source</span>
                </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-subtle text-xs font-medium">
            &copy; {new Date().getFullYear()} MicroPng. Crafted with precision.
          </p>
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-2 text-subtle text-[10px] uppercase font-bold tracking-widest">
                <Zap size={10} className="text-primary" />
                Performance First
             </div>
             <a 
              href="https://github.com/SahilFruitwala/MicroPng" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-subtle hover:text-white text-xs transition-colors font-medium flex items-center gap-2 group"
             >
                <Terminal size={12} className="text-primary group-hover:scale-110 transition-transform" />
                For privacy checkout code and make it more private
             </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
