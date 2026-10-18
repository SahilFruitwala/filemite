import { useId } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Loader2,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { JobState } from '@/hooks/use-job';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Main workspace on the left, sticky options/action column on the right.
 * On small screens the options move above the workspace once there is
 * something to act on, so the action isn't buried below every page.
 */
export function ToolLayout({
  main,
  sidebar,
  active,
}: {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  active: boolean;
}) {
  return (
    <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="min-w-0">{main}</div>
      <aside
        className={cn('flex flex-col gap-4 lg:sticky lg:top-32', active && 'max-lg:order-first')}
      >
        {sidebar}
      </aside>
    </section>
  );
}

export function Panel({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="eyebrow">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Labelled group inside a panel. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[13px] font-medium">{label}</p>
      {children}
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Message({
  tone,
  children,
  onDismiss,
}: {
  tone: 'error' | 'info' | 'success';
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertTriangle : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
        tone === 'error' && 'border-danger/25 bg-danger-soft text-foreground [&>svg]:text-danger',
        tone === 'info' && 'border-border bg-muted text-foreground [&>svg]:text-muted-foreground',
        tone === 'success' &&
          'border-success/25 bg-success-soft text-foreground [&>svg]:text-success',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 leading-5">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-my-0.5 shrink-0 rounded px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function ProgressBar({ progress }: { progress: number | null }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-300',
          progress === null && 'w-1/3 animate-pulse',
        )}
        style={progress === null ? undefined : { width: `${Math.max(4, progress * 100)}%` }}
      />
    </div>
  );
}

/** Primary action with inline progress, plus a hint explaining why it's disabled. */
export function ActionPanel({
  label,
  disabledReason,
  job,
  onRun,
  children,
}: {
  label: string;
  /** When set, the action is disabled and this explains why. */
  disabledReason: string | null;
  job: JobState<unknown>;
  onRun: () => void;
  children?: React.ReactNode;
}) {
  const running = job.status === 'running';
  const progress = running ? job.progress : null;

  return (
    <Panel>
      {children && <div className="mb-4 space-y-4">{children}</div>}
      <Button size="xl" block disabled={!!disabledReason || running} onClick={onRun}>
        {running ? (
          <>
            <Loader2 className="animate-spin" />
            {progress === null ? 'Working…' : `Working… ${Math.round(progress * 100)}%`}
          </>
        ) : (
          label
        )}
      </Button>
      {running && (
        <div className="mt-3">
          <ProgressBar progress={progress} />
        </div>
      )}
      {disabledReason && !running && (
        <p className="mt-3 text-center text-xs text-muted-foreground">{disabledReason}</p>
      )}
      {job.status === 'error' && (
        <div className="mt-3">
          <Message tone="error">{job.error}</Message>
        </div>
      )}
    </Panel>
  );
}

export function FileRow({
  name,
  detail,
  onDownload,
  icon,
}: {
  name: string;
  detail: string;
  onDownload: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        {icon ?? <FileText className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="font-mono text-[11px] text-muted-foreground tabular">{detail}</p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Download ${name}`} onClick={onDownload}>
        <Download />
      </Button>
    </div>
  );
}

export function ResultPanel({
  title,
  children,
  onDownload,
  downloadLabel = 'Download',
  onStartOver,
  startOverLabel = 'Start over',
}: {
  title: string;
  children?: React.ReactNode;
  onDownload?: () => void;
  downloadLabel?: string;
  onStartOver: () => void;
  startOverLabel?: string;
}) {
  return (
    <Panel className="border-primary-line">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
      {onDownload && (
        <Button size="xl" block className="mt-5" onClick={onDownload}>
          <Download />
          {downloadLabel}
        </Button>
      )}
      <Button variant="ghost" block className="mt-2" onClick={onStartOver}>
        <RotateCcw />
        {startOverLabel}
      </Button>
    </Panel>
  );
}

export function outputDetail(bytes: Uint8Array, pages?: number) {
  return [
    pages !== undefined ? `${pages} page${pages === 1 ? '' : 's'}` : null,
    formatBytes(bytes.length),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg border border-border bg-muted p-0.5',
        disabled && 'opacity-50',
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            disabled={disabled}
            className={cn(
              'min-h-8 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] hover:text-foreground',
              active && 'bg-card text-foreground shadow-sm',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Stacked radio cards with a title and description. */
export function ChoiceList<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; description: string; badge?: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow]',
              active
                ? 'border-primary bg-primary-soft shadow-sm'
                : 'border-border bg-card hover:border-border-strong',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card',
                active && 'border-primary bg-primary',
              )}
            >
              {active && <span className="size-1.5 rounded-full bg-primary-foreground" />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {option.label}
                {option.badge && (
                  <span className="rounded-full bg-primary px-1.5 py-px font-mono text-[10px] tracking-wide text-primary-foreground uppercase">
                    {option.badge}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    // The whole row is the label, so it's one large touch target.
    <label
      htmlFor={id}
      className="-m-1.5 flex cursor-pointer items-start gap-3 rounded-lg p-1.5 hover:bg-muted/60"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-px size-[18px] shrink-0 cursor-pointer rounded accent-primary"
      />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/** Before → after size readout with a proportional bar. */
export function SizeBar({
  label,
  bytes,
  fraction,
  highlight = false,
}: {
  label: string;
  bytes: number;
  fraction: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[13px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular">{formatBytes(bytes)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', highlight ? 'bg-primary' : 'bg-foreground/25')}
          style={{ width: `${Math.max(2, Math.min(1, fraction) * 100)}%` }}
        />
      </div>
    </div>
  );
}
