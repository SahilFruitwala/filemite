import type { LucideIcon } from 'lucide-react';

import type { EditorTool } from '@/features/pdf/lib/editor-items';
import { cn } from '@/lib/utils';

export type PaletteTool = { value: EditorTool; label: string; icon: LucideIcon; hint: string };

/** Grid of tool buttons with a one-line hint for the active tool underneath. */
export function ToolPalette({
  tools,
  value,
  onChange,
  disabled,
}: {
  tools: PaletteTool[];
  value: EditorTool;
  onChange: (tool: EditorTool) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div role="radiogroup" aria-label="Tool" className="grid grid-cols-3 gap-1.5">
        {tools.map(({ value: tool, label, icon: Icon }) => (
          <button
            key={tool}
            type="button"
            role="radio"
            aria-checked={value === tool}
            disabled={disabled}
            onClick={() => onChange(tool)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50',
              value === tool
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {tools.find((item) => item.value === value)?.hint}
      </p>
    </>
  );
}
