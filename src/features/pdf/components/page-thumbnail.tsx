import { useEffect, useRef, useState } from "react";
import { FileWarning } from "lucide-react";

import { requestThumbnail } from "@/features/pdf/lib/engine";
import { cn } from "@/lib/utils";

/** Render width in pixels; thumbnails display at roughly 120–200 CSS px. */
const RENDER_WIDTH = 280;

/**
 * Lazily rendered page preview. Rendering is requested only while the
 * thumbnail is near the viewport, so documents with hundreds of pages stay fast.
 */
export function PageThumbnail({
  docId,
  pageIndex,
  className,
  alt,
}: {
  docId: string;
  pageIndex: number;
  className?: string;
  alt?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);
  const key = `${docId}:${pageIndex}`;
  const result = state?.key === key ? state : null;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let cancel: (() => void) | null = null;
    let done = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (done) return;
        if (entry.isIntersecting && !cancel) {
          cancel = requestThumbnail(docId, pageIndex, RENDER_WIDTH, (url) => {
            done = true;
            observer.disconnect();
            setState({ key: `${docId}:${pageIndex}`, url });
          });
        } else if (!entry.isIntersecting && cancel) {
          cancel();
          cancel = null;
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancel?.();
    };
  }, [docId, pageIndex]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted",
        className
      )}
    >
      {result?.url ? (
        <img
          alt={alt ?? `Page ${pageIndex + 1}`}
          className="h-full w-full object-contain"
          draggable={false}
          src={result.url}
        />
      ) : result ? (
        <FileWarning className="size-6 text-muted-foreground" aria-label="Preview unavailable" />
      ) : (
        <div className="absolute inset-3 animate-pulse rounded-sm bg-background/70" />
      )}
    </div>
  );
}
