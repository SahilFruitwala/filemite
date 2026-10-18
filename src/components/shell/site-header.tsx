import { useEffect, useRef } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

import { LogoMark, Wordmark } from '@/components/shell/logo';
import { ThemeSwitch } from '@/components/shell/theme';
import { SECTIONS, sectionForPath, toolsIn, type Section } from '@/lib/tools';
import { cn } from '@/lib/utils';

const SECTION_ORDER: Section[] = ['image', 'pdf'];

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const section = sectionForPath(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 rounded-md" aria-label="Home">
          <LogoMark />
          <Wordmark className="hidden sm:inline" />
        </Link>

        <nav
          aria-label="Sections"
          className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5"
        >
          {SECTION_ORDER.map((id) => {
            const active = section === id;
            return (
              <Link
                key={id}
                to={SECTIONS[id].href}
                data-section={id}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                  active && 'bg-primary text-primary-foreground hover:text-primary-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 rounded-full bg-primary',
                    active && 'bg-primary-foreground',
                  )}
                />
                {SECTIONS[id].label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
        </div>
      </div>

      {section && <ToolTabs section={section} pathname={pathname} />}
    </header>
  );
}

function ToolTabs({ section, pathname }: { section: Section; pathname: string }) {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the active tab visible on narrow screens.
  useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    <div data-section={section} className="border-t border-border/70">
      <div
        ref={scroller}
        className="scrollbar-none mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4 lg:px-6"
      >
        <nav aria-label={SECTIONS[section].title} className="flex min-w-max">
          {toolsIn(section).map((tool) => {
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
    </div>
  );
}
