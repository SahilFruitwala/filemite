import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MarkupStage, type ToolStyle } from "@/components/markup/markup-stage";
import { Button } from "@/components/ui/button";
import type { EditorItems } from "@/features/pdf/hooks/use-editor-items";
import { countOnPage, type EditorTool } from "@/features/pdf/lib/editor-items";
import { getPageSize, requestThumbnail } from "@/features/pdf/lib/engine";
import type { PageSize } from "@/features/pdf/lib/overlay-geometry";

export type { ToolStyle };

/** Render width of the page image, in pixels. */
const RENDER_WIDTH = 1200;

/**
 * One page of an open PDF with page navigation, and marks laid over it. The
 * page is drawn by the preview worker; marks are in page points, so what is
 * shown is what the engine writes.
 */
export function PageEditor({
  docId,
  pageCount,
  pageIndex,
  onPageChange,
  editor,
  tool,
  style,
  selectedId,
  onSelect,
  editingId,
  onEditing,
  onToolChange,
  ariaLabel,
}: {
  docId: string;
  pageCount: number;
  pageIndex: number;
  onPageChange: (page: number) => void;
  editor: EditorItems;
  tool: EditorTool;
  style: ToolStyle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  editingId: string | null;
  onEditing: (id: string | null) => void;
  onToolChange: (tool: EditorTool) => void;
  ariaLabel: string;
}) {
  const key = `${docId}:${pageIndex}`;
  const [sizes, setSizes] = useState<Record<string, PageSize | null>>({});
  const [images, setImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    getPageSize(docId, pageIndex).then(
      ([width, height]) => !cancelled && setSizes((all) => ({ ...all, [key]: { width, height } })),
      () => !cancelled && setSizes((all) => ({ ...all, [key]: null }))
    );
    const cancel = requestThumbnail(docId, pageIndex, RENDER_WIDTH, (url) => {
      if (!cancelled) setImages((all) => ({ ...all, [key]: url }));
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, [docId, pageIndex, key]);

  const here = countOnPage(editor.items, pageIndex);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <ChevronLeft />
          </Button>
          <label className="flex items-center gap-1.5 px-1 text-sm">
            <span className="sr-only">Page number</span>
            <input
              key={pageIndex}
              type="number"
              min={1}
              max={pageCount}
              defaultValue={pageIndex + 1}
              aria-label="Page number"
              className="h-8 w-14 rounded-md border border-border bg-card px-2 text-center font-mono text-sm tabular outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              onChange={(event) => {
                const page = Number(event.target.value);
                if (Number.isInteger(page) && page >= 1 && page <= pageCount) onPageChange(page - 1);
              }}
            />
            <span className="text-muted-foreground">of {pageCount}</span>
          </label>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground tabular">
          {here} on this page · {editor.items.length} in total
        </p>
      </div>

      <MarkupStage
        size={sizes[key]}
        imageUrl={images[key]}
        pageIndex={pageIndex}
        editor={editor}
        tool={tool}
        style={style}
        selectedId={selectedId}
        onSelect={onSelect}
        editingId={editingId}
        onEditing={onEditing}
        onToolChange={onToolChange}
        ariaLabel={ariaLabel}
        alt={`Page ${pageIndex + 1}`}
      />
    </div>
  );
}
