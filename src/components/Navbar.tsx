"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, Github, Zap, Palette, FileText, Layout, ChevronDown } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = [
    {
      name: "Optimization",
      icon: <Zap size={16} />,
      links: [
        { href: "/", label: "Compress" },
        { href: "/convert", label: "Convert" },
        { href: "/resize", label: "Resize" },
        // { href: "/compare", label: "Compare" },
      ]
    },
    {
      name: "Creative",
      icon: <Palette size={16} />,
      links: [
        { href: "/filters", label: "Filters" },
        { href: "/glass", label: "Glass" },
        { href: "/crop", label: "Smart Crop" },
      ]
    },
    {
      name: "Development",
      icon: <FileText size={16} />,
      links: [
        { href: "/favicon", label: "Favicon" },
        { href: "/scrub", label: "Scrub" },
        { href: "/palette", label: "Palette" },
        { href: "/watermark", label: "Watermark" },
        // { href: "/tracer", label: "Tracer" },
      ]
    },
    {
      name: "Documents",
      icon: <Layout size={16} />,
      links: [
        { href: "/pdf", label: "PDF Tools" },
      ]
    }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
    <header className="fixed top-0 w-full z-[100] bg-background border-b-2 border-border shadow-sm">
      <nav className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 bg-foreground text-background flex items-center justify-center font-black text-xl border-2 border-transparent group-hover:bg-primary group-hover:text-white group-hover:border-border transition-all">
            M
          </div>
          <span className="font-black text-xl tracking-tighter uppercase relative">
            Micro<span className="text-primary">Png</span>
            <div className="absolute -bottom-1 left-0 w-0 h-1 bg-primary group-hover:w-full transition-all duration-300"></div>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors">Compress</Link>
            
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className="text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors flex items-center gap-1"
                >
                    Tools
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* Desktop Dropdown - Multi-column for many tools */}
                <div className={`absolute top-full right-0 w-[480px] pt-4 transition-all duration-200 transform ${isToolsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'}`}>
                    <div className="bg-surface border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)] p-4 grid grid-cols-2 gap-4">
                        {categories.map((cat) => (
                            <div key={cat.name} className="space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary border-b border-border pb-1">
                                    {cat.icon}
                                    {cat.name}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {cat.links.map((link) => (
                                        <Link 
                                            key={link.href}
                                            href={link.href} 
                                            onClick={() => setIsToolsOpen(false)}
                                            className="px-2 py-1 text-xs font-bold hover:bg-primary hover:text-white transition-colors uppercase"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ThemeToggle />

            <a href="https://github.com/sahilfruitwala/micro-png" target="_blank" rel="noopener noreferrer" className="bg-foreground text-background px-4 py-2 text-xs font-black uppercase hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_0px_var(--color-border)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_var(--color-border)] flex items-center gap-2">
                <Github size={16} />
                GitHub
            </a>
        </div>

        {/* Mobile Menu Button */}
        <button 
            className="md:hidden p-2 border-2 border-transparent hover:border-foreground transition-all relative z-[110]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
        >
            {isMenuOpen ? (
                <X size={24} className="text-foreground" />
            ) : (
                <Menu size={24} className="text-foreground" />
            )}
        </button>
      </nav>
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
          <div className="fixed inset-0 z-[105] bg-background p-6 md:hidden flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 overflow-y-auto no-scrollbar pt-24 pb-32">
              {categories.map((cat) => (
                  <div key={cat.name} className="space-y-3">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                          {cat.icon}
                          {cat.name}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                          {cat.links.map((link) => (
                              <Link 
                                  key={link.href}
                                  href={link.href} 
                                  onClick={() => setIsMenuOpen(false)} 
                                  className={`text-sm font-bold uppercase tracking-wide p-3 border-2 border-border transition-all ${
                                      pathname === link.href
                                          ? "bg-primary text-white shadow-[4px_4px_0px_0px_black] dark:shadow-[4px_4px_0px_0px_white]"
                                          : "bg-surface hover:translate-x-1 hover:shadow-[4px_4px_0px_0px_var(--color-border)]"
                                  }`}
                              >
                                  {link.label}
                              </Link>
                          ))}
                      </div>
                  </div>
              ))}
              <div className="h-px bg-border/50"></div>
              <div className="flex items-center justify-between pt-2 pb-10">
                  <span className="text-sm font-bold uppercase">Theme</span>
                  <ThemeToggle />
              </div>
          </div>
      )}
    </header>
    </>
  );
}
