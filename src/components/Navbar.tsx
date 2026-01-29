import Link from 'next/link';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu, X, Github } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Compress' },
    { href: '/convert', label: 'Convert' },
    { href: '/favicon', label: 'Favicon' },
    { href: '/scrub', label: 'Scrub' },
    { href: '/palette', label: 'Palette' },
    { href: '/watermark', label: 'Watermark' },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-[100] flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 z-[101]">
          <div className="text-white p-1 rounded-xl overflow-hidden flex items-center justify-center">
             <Image src="/icon.png" alt="MicroPng Logo" width={24} height={24} className="object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">MicroPng</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-1 bg-surface p-1 rounded-lg">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  pathname === link.href 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/SahilFruitwala/MicroPng" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex text-muted hover:text-foreground transition-colors p-2"
            title="View on GitHub"
          >
            <Github size={22} />
          </a>
          
          <ThemeToggle />
          
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-muted hover:text-foreground p-2 z-[101]"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-background/95 backdrop-blur-xl z-[90] lg:hidden transition-all duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col items-center justify-center h-full gap-8 p-6">
          <div className="flex flex-col items-center gap-4">
             {navLinks.map((link) => (
               <Link 
                key={link.href}
                href={link.href} 
                onClick={() => setIsMenuOpen(false)}
                className={`text-3xl font-bold transition-all ${
                    pathname === link.href 
                        ? 'text-primary' 
                        : 'text-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
             ))}
          </div>
          
          <div className="h-px w-24 bg-border" />
          
          <a 
            href="https://github.com/SahilFruitwala/MicroPng" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-muted hover:text-foreground text-lg font-medium"
          >
            <Github size={24} />
            GitHub Repository
          </a>
        </div>
      </div>
    </>
  );
}
