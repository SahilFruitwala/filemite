import { Cloud, Laptop } from 'lucide-react';

import JsonLd from '@/components/JsonLd';
import { toolJsonLd } from '@/lib/seo';
import { SECTIONS, toolsIn, type Tool } from '@/lib/tools';

const PROCESSING_COPY = {
  browser: { icon: Laptop, label: 'Runs in your browser — nothing is uploaded' },
  server: { icon: Cloud, label: 'Processed in memory — never stored' },
} as const;

/** Page frame for every tool: section accent, header and structured data. */
export function ToolPage({ tool, children }: { tool: Tool; children: React.ReactNode }) {
  const Icon = tool.icon;
  const index = toolsIn(tool.section).findIndex((item) => item.id === tool.id) + 1;
  const processing = PROCESSING_COPY[tool.processing];
  const ProcessingIcon = processing.icon;

  return (
    <div
      data-section={tool.section}
      className="mx-auto w-full max-w-7xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 lg:px-8"
    >
      <JsonLd data={toolJsonLd(tool)} />
      <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md sm:size-14">
            <Icon className="size-6 sm:size-7" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">
              {SECTIONS[tool.section].label} · {String(index).padStart(2, '0')}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {tool.title}
            </h1>
            <p className="mt-1.5 max-w-xl text-[15px] leading-6 text-muted-foreground">
              {tool.description}
            </p>
          </div>
        </div>
        <p className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:self-auto">
          <ProcessingIcon className="size-3.5 text-primary" />
          {processing.label}
        </p>
      </header>
      {children}
    </div>
  );
}
