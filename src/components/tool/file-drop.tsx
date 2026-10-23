import { useRef, useState } from 'react';
import { Plus, Upload } from 'lucide-react';

import { Muncher } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Accept = { accept: string; multiple: boolean; onFiles: (files: File[]) => void };

function useFileDrop(onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);

  return {
    isDragging,
    handlers: {
      onDragEnter: (event: React.DragEvent) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        depth.current++;
        setIsDragging(true);
      },
      onDragOver: (event: React.DragEvent) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      },
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setIsDragging(false);
      },
      onDrop: (event: React.DragEvent) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        depth.current = 0;
        setIsDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      },
    },
  };
}

function HiddenInput({
  inputRef,
  accept,
  multiple,
  onFiles,
}: Accept & { inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <input
      ref={inputRef}
      accept={accept}
      className="sr-only"
      multiple={multiple}
      tabIndex={-1}
      type="file"
      onChange={(event) => {
        if (event.target.files?.length) onFiles(Array.from(event.target.files));
        // Reset so picking the same file again still fires change.
        event.target.value = '';
      }}
    />
  );
}

/** Large empty-state drop zone shown before any file is added. */
export function FileDrop({
  accept,
  multiple,
  onFiles,
  title,
  description,
  buttonLabel,
  hint,
  icon: Icon = Upload,
}: Accept & {
  title: string;
  description: string;
  buttonLabel: string;
  /** Formats and limits, e.g. "PNG, JPEG · up to 4 MB each". */
  hint: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging, handlers } = useFileDrop(onFiles);

  return (
    <div
      {...handlers}
      className={cn(
        'group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border-strong bg-card px-6 py-16 text-center transition-[border-color,background-color,transform,box-shadow] duration-200 sm:py-24',
        isDragging && 'scale-[1.01] -rotate-[0.4deg] border-ink bg-primary-soft shadow-pop-lg',
      )}
    >
      <div
        aria-hidden
        className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />
      <div className="relative mb-6">
        {isDragging && (
          <span aria-hidden className="animate-ping-soft absolute inset-0 rounded-2xl bg-primary" />
        )}
        <div
          className={cn(
            'relative flex size-16 -rotate-3 items-center justify-center rounded-2xl border-2 border-ink bg-primary text-primary-foreground shadow-pop transition-transform duration-300 group-hover:rotate-3',
            isDragging ? 'scale-110 rotate-6' : 'animate-wiggle',
          )}
        >
          <Icon className="size-7" />
        </div>
        {isDragging && (
          <Muncher className="absolute -top-5 -right-7 size-10 animate-in zoom-in-50 spin-in-12 duration-300" />
        )}
      </div>
      <h2 className="relative font-display text-2xl font-semibold tracking-tight">
        {isDragging ? 'Feed me! 🍪' : title}
      </h2>
      <p className="relative mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button size="xl" className="relative mt-7" onClick={() => inputRef.current?.click()}>
        {buttonLabel}
      </Button>
      <p className="relative mt-4 font-mono text-[11px] tracking-wide text-muted-foreground">
        or drop {multiple ? 'files' : 'a file'} here · {hint}
      </p>
      <HiddenInput inputRef={inputRef} accept={accept} multiple={multiple} onFiles={onFiles} />
    </div>
  );
}

/** Wraps a workspace so files can be dropped onto it after the first upload. */
export function DropTarget({
  onFiles,
  children,
  className,
}: {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { isDragging, handlers } = useFileDrop(onFiles);
  return (
    <div {...handlers} className={cn('relative', className)}>
      {children}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex animate-in fade-in zoom-in-95 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink bg-primary-soft/90 font-display text-lg font-semibold backdrop-blur-sm">
          <Muncher className="size-10" />
          Feed me more!
        </div>
      )}
    </div>
  );
}

/** Small button that opens the file picker. */
export function AddFilesButton({
  accept,
  multiple,
  onFiles,
  label,
  variant = 'outline',
}: Accept & { label: string; variant?: 'outline' | 'ghost' }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant={variant} onClick={() => inputRef.current?.click()}>
        <Plus />
        {label}
      </Button>
      <HiddenInput inputRef={inputRef} accept={accept} multiple={multiple} onFiles={onFiles} />
    </>
  );
}
