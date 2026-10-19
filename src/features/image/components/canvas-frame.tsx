import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/** Framed canvas on a checkerboard (for transparency); scales down to fit, keeping its aspect ratio. */
export const CanvasFrame = forwardRef<
  HTMLCanvasElement,
  { className?: string; label: string; maxHeight?: number; children?: React.ReactNode }
>(function CanvasFrame({ className, label, maxHeight, children }, ref) {
  return (
    <div className="bg-checker flex items-center justify-center overflow-hidden rounded-xl border border-border p-2">
      <div className={cn('relative max-w-full', className)}>
        <canvas
          ref={ref}
          role="img"
          aria-label={label}
          className="block h-auto max-w-full"
          style={maxHeight ? { maxHeight, width: 'auto' } : undefined}
        />
        {children}
      </div>
    </div>
  );
});
