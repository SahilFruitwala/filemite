import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/site';

/** A file with a folded corner, and a tiny mite sitting on it: two eyes, two feet. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('size-8 shrink-0', className)}>
      <rect width="64" height="64" rx="18" className="fill-foreground" />
      <path
        d="M19 14h18l10 10v24a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5V19a5 5 0 0 1 5-5Z"
        className="fill-background"
      />
      <path d="M37 14v6a4 4 0 0 0 4 4h6L37 14Z" className="fill-tangerine" />
      <g className="mite-eye">
        <circle cx="25" cy="35" r="3.2" className="fill-foreground" />
        <circle cx="26" cy="34" r="1" className="fill-background" />
      </g>
      <g className="mite-eye">
        <circle cx="36" cy="35" r="3.2" className="fill-foreground" />
        <circle cx="37" cy="34" r="1" className="fill-background" />
      </g>
      <g className="mite-feet">
        <rect x="22" y="43" width="5" height="4" rx="2" className="fill-cobalt" />
        <rect x="34" y="43" width="5" height="4" rx="2" className="fill-cobalt" />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  const first = SITE_NAME.slice(0, 4);
  const rest = SITE_NAME.slice(4);
  return (
    <span className={cn('font-display text-[19px] font-bold tracking-tight', className)}>
      {first}
      <span className="text-primary">{rest}</span>
    </span>
  );
}
