import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, Github, ChevronDown, Zap, Palette, FileText, Layout, Scissors, Layers, Wind, Droplets, Target, Image as ImageIcon } from "lucide-react";
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
      <nav className="fixed top-0 w-full z-[100] flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40">
        <Link href="/" className="flex items-center gap-3 z-[101] group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl border border-border/50 group-hover:border-primary/50 transition-all duration-300">
            <Image
              src="/icon.png"
              alt="MicroPng Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            MicroPng
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/"
                  ? "text-primary"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              Home
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isToolsOpen || categories.some(c => c.links.some(l => l.href === pathname))
                    ? "text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                Tools
                <ChevronDown size={14} className={`transition-transform duration-300 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Tools Dropdown */}
              <div className={`absolute top-full right-0 mt-2 w-[480px] bg-background border border-border/50 rounded-2xl shadow-2xl p-6 grid grid-cols-2 gap-x-8 gap-y-6 transition-all duration-300 transform origin-top-right ${isToolsOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                {categories.map((cat) => (
                  <div key={cat.name} className="space-y-3">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] flex items-center gap-2">
                      <span className="text-primary/60">{cat.icon}</span>
                      {cat.name}
                    </p>
                    <div className="grid gap-1">
                      {cat.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsToolsOpen(false)}
                          className={`text-sm px-3 py-1.5 rounded-md transition-all ${
                            pathname === link.href
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted hover:text-foreground hover:bg-surface"
                          }`}
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
        </div>

        <div className="flex items-center gap-2 sm:gap-4 font-inter">
          <a
            href="https://github.com/SahilFruitwala/MicroPng"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex text-muted hover:text-foreground transition-colors p-2"
            title="View on GitHub"
          >
            <Github size={20} />
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
      <div
        className={`fixed inset-0 bg-background/98 backdrop-blur-xl z-[90] lg:hidden transition-all duration-300 ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div className="flex flex-col h-full overflow-y-auto px-6 pt-32 pb-10">
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-4">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-2">
                  {cat.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {cat.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`text-lg font-bold px-4 py-3 rounded-xl transition-all ${
                        pathname === link.href
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "text-foreground/80 bg-surface hover:bg-surface-hover"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border/50">
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
      </div>
    </>
  );
}
