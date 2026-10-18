import { ImageUp, X } from 'lucide-react';

import { AddFilesButton, DropTarget, FileDrop } from '@/components/tool/file-drop';
import { Message } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import type { Tool } from '@/lib/tools';

/**
 * Workspace shell for tools that take one image: empty-state drop zone,
 * then a file bar (replace / remove) above the tool's own content.
 */
export function SingleImageWorkspace({
  tool,
  file,
  previewUrl,
  dimensions,
  accept,
  hint,
  notice,
  onFiles,
  onClear,
  children,
}: {
  tool: Tool;
  file: File | null;
  previewUrl: string | null;
  dimensions?: { width: number; height: number } | null;
  accept: string;
  hint: string;
  notice?: string | null;
  onFiles: (files: File[]) => void;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  if (!file) {
    return (
      <div className="space-y-3">
        <FileDrop
          accept={accept}
          multiple={false}
          onFiles={onFiles}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose image"
          hint={hint}
          icon={ImageUp}
        />
        {notice && <Message tone="error">{notice}</Message>}
      </div>
    );
  }

  return (
    <DropTarget onFiles={onFiles} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="bg-checker size-10 shrink-0 overflow-hidden rounded-lg border border-border">
          {previewUrl && <img src={previewUrl} alt="" className="size-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground tabular">
            {formatBytes(file.size)}
            {dimensions && ` · ${dimensions.width}×${dimensions.height}`}
          </p>
        </div>
        <AddFilesButton accept={accept} multiple={false} onFiles={onFiles} label="Replace" />
        <Button variant="ghost" size="icon" aria-label="Remove image" onClick={onClear}>
          <X />
        </Button>
      </div>
      {notice && <Message tone="error">{notice}</Message>}
      {children}
    </DropTarget>
  );
}

/** Framed preview with a checkerboard for transparency. */
export function ImagePreview({
  src,
  alt,
  label,
  caption,
  className,
}: {
  src: string;
  alt: string;
  label?: string;
  caption?: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="bg-checker relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border">
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        {label && (
          <span className="absolute top-2.5 left-2.5 rounded-md bg-foreground/80 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-background uppercase backdrop-blur">
            {label}
          </span>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center font-mono text-[11px] text-muted-foreground tabular">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
