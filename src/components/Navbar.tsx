"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, Github, Zap, Palette, FileText, Layout, ChevronDown, Terminal } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import Button from "./ui/Button";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
        { href: "/cli", label: "CLI Tool" },
        { href: "/scrub", label: "Scrub" },
        { href: "/palette", label: "Palette" },
        { href: "/watermark", label: "Watermark" },
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

    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`fixed top-0 w-full transition-all duration-300 ${isMenuOpen ? 'z-[1000]' : 'z-[100]'}`}>
      <nav className={`
        fixed top-4 left-4 right-4 transition-all duration-300
        ${isMenuOpen ? 'z-[1000]' : 'z-50'}
        ${scrolled
          ? 'bg-background/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl py-3 px-4 sm:px-6 w-[calc(100%-2rem)] mx-auto max-w-7xl'
          : 'bg-transparent border-transparent py-4 px-4 sm:px-6'
        }
      `}>
        <div className="flex items-center justify-between mx-auto max-w-7xl">

          <Link href="/" className="flex items-center gap-2 group relative z-50">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 overflow-hidden rounded-xl border border-border/50 shadow-sm transition-transform group-hover:scale-105">
              <Image
                src="/icon.webp"
                alt="MicroPng"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Micro<span className="text-primary">Png</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Compress</Link>
            <Link href="/cli" className="text-sm font-medium hover:text-primary transition-colors">CLI</Link>
            <Link href="/favicon" className="text-sm font-medium hover:text-primary transition-colors">Favicon</Link>

            <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className="px-4 py-2 font-medium text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                >
                  Tools
                  <ChevronDown size={14} className={`transition-transform duration-200 group-hover:text-primary ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[540px] bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-6 grid grid-cols-2 gap-x-8 gap-y-6 transition-all duration-300 origin-top z-[110] ${isToolsOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
                >
                    {categories.map((cat) => (
                        <div key={cat.name} className="space-y-3">
                            <div className="flex items-center gap-2 px-1 text-primary">
                                {cat.icon}
                                <span className="text-[10px] font-bold uppercase tracking-widest">{cat.name}</span>
                            </div>
                            <div className="grid gap-1">
                                {cat.links.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsToolsOpen(false)}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all group"
                                    >
                                         <span className="font-semibold text-sm group-hover:text-primary transition-colors">{item.label}</span>
                                         <div className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link
                href="https://github.com/SahilFruitwala/micropng"
                target="_blank"
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
              >
                <Github size={20} />
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 active:scale-95 transition-transform relative z-[110] transition-colors ${isMenuOpen ? 'text-primary' : 'text-foreground'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
          <div className="fixed inset-0 z-[900] bg-background p-6 md:hidden flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 overflow-y-auto pt-24 pb-32">
              <div className="grid grid-cols-1 gap-2">
                  {[
                      { href: "/", label: "Compress", icon: <Zap size={16} /> },
                      { href: "/cli", label: "CLI", icon: <Terminal size={16} /> },
                      { href: "/favicon", label: "Favicon", icon: <Layout size={16} /> },
                  ].map((link) => (
                      <Link 
                          key={link.href}
                          href={link.href} 
                          onClick={() => setIsMenuOpen(false)} 
                          className={`flex items-center gap-3 text-lg font-bold p-4 rounded-2xl border transition-all ${
                              pathname === link.href
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                  : "bg-surface border-border hover:border-primary/50"
                          }`}
                      >
                          {link.icon}
                          {link.label}
                      </Link>
                  ))}
              </div>
              <div className="h-px bg-border/50 my-2"></div>
              {categories.map((cat) => (
                  <div key={cat.name} className="space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          {cat.icon}
                          {cat.name}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                          {cat.links.map((link) => (
                              <Link 
                                  key={link.href}
                                  href={link.href} 
                                  onClick={() => setIsMenuOpen(false)} 
                                  className={`text-sm font-medium p-3 rounded-xl border transition-all ${
                                      pathname === link.href
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-surface border-border hover:border-primary/50"
                                  }`}
                              >
                                  {link.label}
                              </Link>
                          ))}
                      </div>
                  </div>
              ))}
              <div className="h-px bg-border"></div>
              <div className="flex items-center justify-between pt-2 pb-10">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
              </div>
          </div>
      )}
    </header>
  );
}
