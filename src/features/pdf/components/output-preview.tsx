import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileWarning, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  closeDocument,
  EngineError,
  openDocument,
  requestThumbnail,
} from "@/features/pdf/lib/engine";
import type { OutputFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/** Wide enough to read body text on a full-width page. */
const RENDER_WIDTH = 1000;

type Opened = { key: string; pageCount: number } | { key: string; error: string };

/**
 * Shows the finished PDF page by page, rendered from the exact bytes that
 * Download will save, so what the user checks is what they get.
 */
export function PdfOutputPreview({
  files,
  title = "Preview of your PDF",
  onEdit,
  editLabel = "Back to editing",
}: {
  /** One entry per output file; several get a picker. */
  files: OutputFile[];
  title?: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  const [fileIndex, setFileIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const file = files[Math.min(fileIndex, files.length - 1)];

  const [opened, setOpened] = useState<Opened | null>(null);
  const [image, setImage] = useState<{ key: string; url: string | null } | null>(null);

  // Renders are cached per document id, so a fresh id per file also keeps
  // two different outputs from sharing cached pages.
  const [docKey, setDocKey] = useState<string | null>(null);

  useEffect(() => {
    const docId = `preview-${crypto.randomUUID()}`;
    let alive = true;
    openDocument(docId, new File([file.bytes as BlobPart], file.name, { type: "application/pdf" })).then(
      ({ pageCount }) => {
        if (!alive) return;
        setDocKey(docId);
        setOpened({ key: docId, pageCount });
      },
      (error: unknown) => {
        if (!alive) return;
        setDocKey(docId);
        setOpened({
          key: docId,
          error:
            error instanceof EngineError || error instanceof Error
              ? error.message
              : "Couldn’t render a preview.",
        });
      }
    );
    return () => {
      alive = false;
      setDocKey(null);
      closeDocument(docId);
    };
  }, [file]);

  const ready = docKey && opened?.key === docKey ? opened : null;
  const pageCount = ready && "pageCount" in ready ? ready.pageCount : 0;
  const page = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const imageKey = `${docKey}:${page}`;

  useEffect(() => {
    if (!docKey || !pageCount) return;
    return requestThumbnail(docKey, page, RENDER_WIDTH, (url) =>
      setImage({ key: `${docKey}:${page}`, url })
    );
  }, [docKey, page, pageCount]);

  const current = image?.key === imageKey ? image : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{file.name}</p>
        </div>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            {editLabel}
          </Button>
        )}
      </div>

      {files.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Output files">
          {files.map((item, index) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={index === fileIndex}
              onClick={() => {
                setFileIndex(index);
                setPageIndex(0);
              }}
              className={cn(
                "max-w-48 truncate rounded-lg border px-2.5 py-1 text-xs transition-colors",
                index === fileIndex
                  ? "border-primary-line bg-primary-soft text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted p-3">
        {ready && "error" in ready ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileWarning className="size-4" /> {ready.error}
          </p>
        ) : current?.url ? (
          <img
            src={current.url}
            alt={`Page ${page + 1} of the result`}
            className="max-h-[75vh] max-w-full rounded-sm bg-white object-contain shadow-sm"
            draggable={false}
          />
        ) : current ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileWarning className="size-4" /> Couldn’t render this page.
          </p>
        ) : (
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Rendering preview" />
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPageIndex(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="font-mono text-xs text-muted-foreground tabular">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => setPageIndex(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
