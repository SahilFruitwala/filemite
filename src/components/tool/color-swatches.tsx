import { useId } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export const INK_COLORS = ['#111111', '#d92d20', '#f79009', '#17803d', '#1d4ed8', '#7c3aed', '#ffffff'];
export const HIGHLIGHT_COLORS = ['#ffe600', '#7ef29d', '#ff9ed2', '#6fd6ff', '#ffb35c'];

/** A row of preset colours plus a custom picker. Values are "#rrggbb". */
export function ColorSwatches({
  label,
  value,
  onChange,
  colors = INK_COLORS,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}) {
  const pickerId = useId();
  const custom = !colors.some((color) => color.toLowerCase() === value.toLowerCase());
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {colors.map((color) => {
        const active = color.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'flex size-7 items-center justify-center rounded-full border border-border-strong outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
              active && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
            )}
            style={{ backgroundColor: color }}
          >
            {active && (
              <Check
                className="size-3.5"
                strokeWidth={3}
                style={{ color: color.toLowerCase() === '#ffffff' ? '#111' : '#fff', mixBlendMode: 'difference' }}
              />
            )}
          </button>
        );
      })}
      <label
        htmlFor={pickerId}
        className={cn(
          'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border-strong text-[10px] font-medium text-muted-foreground focus-within:ring-3 focus-within:ring-ring/40',
          custom && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
        )}
        style={custom ? { backgroundColor: value } : undefined}
        title="Custom colour"
      >
        {!custom && '+'}
        <input
          id={pickerId}
          type="color"
          value={value}
          aria-label="Custom colour"
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
