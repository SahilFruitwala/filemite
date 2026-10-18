import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/site';

/** Two overlapping tiles — image and PDF — on an ink square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="64" height="64" rx="16" className="fill-foreground" />
      <rect x="14" y="14" width="22" height="22" rx="6" className="fill-tangerine" />
      <rect
        x="28"
        y="28"
        width="22"
        height="22"
        rx="6"
        className="fill-cobalt"
        fillOpacity={0.95}
      />
      <rect x="28" y="28" width="8" height="8" rx="2" className="fill-background" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  const [first, ...rest] = SITE_NAME.split(' ');
  return (
    <span className={cn('font-display text-[17px] font-semibold tracking-tight', className)}>
      {first}
      {rest.length > 0 && <span className="text-muted-foreground"> {rest.join(' ')}</span>}
    </span>
  );
}
