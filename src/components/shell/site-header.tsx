import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  X,
  type LucideIcon,
} from 'lucide-react';

import { LogoMark, Wordmark } from '@/components/shell/logo';
import { ThemeSwitch } from '@/components/shell/theme';
import { SECTIONS, sectionForPath, toolsIn, type Section } from '@/lib/tools';
import { cn } from '@/lib/utils';

const SECTION_ORDER: Section[] = ['image', 'pdf'];
const SECTION_ICONS: Record<Section, LucideIcon> = {
  image: ImageIcon,
  pdf: FileText,
};

export function SiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const section = sectionForPath(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid h-14 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2 justify-self-start rounded-md"
          aria-label="Home"
        >
          <LogoMark />
          <Wordmark />
        </Link>

        <nav aria-label="Sections" className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {SECTION_ORDER.map((id) => {
            const active = section === id;
            const SectionIcon = SECTION_ICONS[id];
            return (
              <Link
                key={id}
                to={SECTIONS[id].href}
                data-section={id}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                  active && 'bg-background text-foreground shadow-sm ring-1 ring-border',
                )}
              >
                <SectionIcon aria-hidden className={cn('size-4', active && 'text-primary')} />
                {SECTIONS[id].label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <ThemeSwitch />
        </div>
      </div>

      {section && <ToolTabs section={section} pathname={pathname} />}
    </header>
  );
}

function ToolTabs({ section, pathname }: { section: Section; pathname: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const tools = toolsIn(section);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  // Keep the active tab visible on narrow screens.
  useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, section]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const nudge = (direction: 1 | -1) =>
    scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div data-section={section} className="relative border-t border-border/70">
      <div className="mx-auto flex w-full max-w-7xl items-center px-2 sm:px-4 lg:px-6">
        <div className="relative min-w-0 flex-1">
          <div ref={scroller} onScroll={measure} className="scrollbar-none overflow-x-auto">
            <nav aria-label={SECTIONS[section].title} className="flex min-w-max">
              {tools.map((tool) => {
                const active = pathname === tool.href;
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-11 items-center gap-2 px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                      active && 'text-foreground',
                    )}
                  >
                    <Icon className={cn('size-4', active && 'text-primary')} />
                    {tool.shortTitle}
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
          <ScrollEdge side="left" visible={edges.left} onClick={() => nudge(-1)} />
          <ScrollEdge side="right" visible={edges.right} onClick={() => nudge(1)} />
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            'ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 text-[13px] font-semibold shadow-pop-sm transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:shadow-pop active:translate-y-0.5 active:shadow-none',
            menuOpen ? 'bg-primary text-primary-foreground' : 'bg-card',
          )}
        >
          {menuOpen ? <X className="size-4" /> : <LayoutGrid className="size-4" />}
          <span className="max-sm:sr-only">All {tools.length}</span>
        </button>
      </div>

      {menuOpen && (
        <>
          <div aria-hidden className="fixed inset-0 top-[6.5rem] z-40 bg-background/40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 top-full z-50 mx-auto w-full max-w-7xl px-2 pt-2 sm:px-4 lg:px-6">
            <div className="sticker animate-in fade-in slide-in-from-top-2 grid max-h-[70dvh] gap-1 overflow-y-auto rounded-2xl bg-card p-2 duration-200 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool, index) => {
                const active = pathname === tool.href;
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ animationDelay: `${index * 18}ms` }}
                    className={cn(
                      'group flex animate-in fade-in slide-in-from-top-1 fill-mode-both items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-primary-soft',
                      active && 'bg-primary-soft',
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-primary-soft text-primary transition-transform group-hover:-rotate-12 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{tool.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{tool.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Fade plus arrow at an edge of the tab row, shown only when there's more to scroll. */
function ScrollEdge({
  side,
  visible,
  onClick,
}: {
  side: 'left' | 'right';
  visible: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 flex w-16 items-center transition-opacity duration-200',
        side === 'left'
          ? 'left-0 justify-start bg-gradient-to-r from-background via-background/90 to-transparent'
          : 'right-0 justify-end bg-gradient-to-l from-background via-background/90 to-transparent',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClick}
        className={cn(
          'flex size-7 items-center justify-center rounded-full border-2 border-ink bg-card shadow-pop-sm transition-transform hover:scale-110 active:scale-95',
          visible && 'pointer-events-auto',
        )}
      >
        <Icon className="size-4" />
      </button>
    </div>
  );
}
