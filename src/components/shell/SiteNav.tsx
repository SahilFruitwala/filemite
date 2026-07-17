import {
  TopNav,
  TopNavHeading,
  TopNavItem,
} from '@astryxdesign/core/TopNav';
import { Link, useRouterState } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './mode';

const navItems = [
  { href: '/', label: 'Compress' },
  { href: '/crop', label: 'Crop' },
  { href: '/scrub', label: 'Scrub' },
  { href: '/palette', label: 'Palette' },
  { href: '/favicon', label: 'Favicon' },
] as const;

export default function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      {/* Mobile-first bar */}
      <header className="md:hidden sticky top-0 z-[110] border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 h-14">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="/icon.webp" alt="" width={28} height={28} className="rounded-lg shrink-0" />
            <span className="font-display font-bold text-foreground text-lg tracking-tight truncate">
              MicroPNG
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div
            id="mobile-nav"
            className="absolute inset-x-0 top-14 border-b border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <nav className="flex flex-col p-2 pb-3" aria-label="Main navigation">
              {navItems.map((item) => {
                const selected = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                      selected
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>

      {/* Desktop Astryx nav */}
      <div className="hidden md:block">
        <TopNav
          label="Main navigation"
          heading={
            <TopNavHeading
              heading="MicroPNG"
              logo={
                <img
                  src="/icon.webp"
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
              }
              href="/"
            />
          }
          startContent={
            <>
              {navItems.map((item) => (
                <TopNavItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  isSelected={pathname === item.href}
                />
              ))}
            </>
          }
          endContent={<ThemeToggle />}
        />
      </div>
    </>
  );
}
