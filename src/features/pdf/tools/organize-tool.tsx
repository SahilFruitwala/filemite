import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, GripVertical, RotateCcw, RotateCw, Undo2 } from "lucide-react";

import {
  ActionPanel,
  FileRow,
  Panel,
  ResultPanel,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { PdfOutputPreview } from "@/features/pdf/components/output-preview";
import { PageThumbnail } from "@/features/pdf/components/page-thumbnail";
import { PageGrid, SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { organizeFile } from "@/features/pdf/lib/engine";
import {
  initialSlots,
  isUnchanged,
  movedCount,
  moveSlot,
  reverseSlots,
  rotateAll,
  rotatedCount,
  rotateSlot,
  type PageSlot,
} from "@/features/pdf/lib/page-order";
import { useJob } from "@/hooks/use-job";
import { downloadFile, type OutputFile } from "@/lib/download";
import { baseName, plural } from "@/lib/format";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-organize");

export function OrganizeTool() {
  const documents = usePdfDocuments({ multiple: false });
  const job = useJob<OutputFile & { pageCount: number }>('pdf_organize');
  // Edits belong to one document; opening another starts from its own page order.
  const [edit, setEdit] = useState<{ docId: string; slots: PageSlot[] } | null>(null);

  const doc = documents.documents[0];
  const pageCount = doc?.status === "ready" ? (doc.pageCount ?? 0) : 0;
  const fresh = useMemo(() => initialSlots(pageCount), [pageCount]);
  const slots = doc && edit?.docId === doc.id ? edit.slots : fresh;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch screens a swipe should still scroll the page: press and hold to pick a page up.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const change = (update: (current: PageSlot[]) => PageSlot[]) => {
    if (!doc) return;
    job.reset();
    setEdit({ docId: doc.id, slots: update(slots) });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    change((current) => moveSlot(current, Number(active.id), Number(over.id)));
  };

  const documentsApi = {
    ...documents,
    add: (files: File[]) => {
      job.reset();
      setEdit(null);
      documents.add(files);
    },
    clear: () => {
      job.reset();
      setEdit(null);
      documents.clear();
    },
  };

  const moved = movedCount(slots);
  const rotated = rotatedCount(slots);
  const disabledReason = !pageCount
    ? "Add a PDF first."
    : isUnchanged(slots)
      ? "Reorder or rotate some pages first."
      : null;

  const run = () => {
    if (!doc) return;
    const edits = slots.map(({ page, rotate }) => ({ page, rotate }));
    void job.run(async () => ({
      name: `${baseName(doc.file.name)}-organized.pdf`,
      bytes: await organizeFile({ file: doc.file, password: doc.password }, edits),
      pageCount: edits.length,
    }));
  };

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(ready) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-medium">
              {plural(ready.pageCount, "page")}
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                <span className="[@media(hover:none)]:hidden">Drag pages to reorder</span>
                <span className="hidden [@media(hover:none)]:inline">
                  Press and hold a page to move it
                </span>
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              aria-label="Rotate all pages left"
              onClick={() => change((s) => rotateAll(s, -90))}
            >
              <RotateCcw />
              All left
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Rotate all pages right"
              onClick={() => change((s) => rotateAll(s, 90))}
            >
              <RotateCw />
              All right
            </Button>
            <Button variant="outline" size="sm" onClick={() => change(reverseSlots)}>
              <ArrowLeftRight />
              Reverse
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isUnchanged(slots)}
              onClick={() => change(() => initialSlots(ready.pageCount))}
            >
              <Undo2 />
              Reset
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={slots.map((slot) => slot.page)} strategy={rectSortingStrategy}>
              <PageGrid className="list-none">
                {slots.map((slot, index) => (
                  <PageCard
                    key={slot.page}
                    docId={ready.id}
                    slot={slot}
                    position={index + 1}
                    onRotate={(degrees) => change((s) => rotateSlot(s, slot.page, degrees))}
                  />
                ))}
              </PageGrid>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;

  const sidebar = result ? (
    <ResultPanel
      title="Your PDF is ready"
      onDownload={() => downloadFile(result)}
      onStartOver={documentsApi.clear}
    >
      <FileRow
        name={result.name}
        detail={outputDetail(result.bytes, result.pageCount)}
        onDownload={() => downloadFile(result)}
      />
    </ResultPanel>
  ) : (
    <>
      <Panel title="Changes">
        {isUnchanged(slots) ? (
          <p className="text-sm text-muted-foreground">
            Drag pages into a new order or use the arrows under a page to rotate it.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {moved > 0 && (
              <li>
                <strong className="text-foreground">{plural(moved, "page")}</strong> in a new position
              </li>
            )}
            {rotated > 0 && (
              <li>
                <strong className="text-foreground">{plural(rotated, "page")}</strong> rotated
              </li>
            )}
          </ul>
        )}
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          To delete pages, use{" "}
          <Link to="/pdf/extract" className="font-medium text-foreground underline underline-offset-2">
            Extract pages
          </Link>
          .
        </p>
      </Panel>
      <ActionPanel
        label="Save PDF"
        disabledReason={disabledReason}
        job={job.state}
        onRun={run}
      />
    </>
  );

  return <ToolLayout main={result ? <PdfOutputPreview files={[result]} onEdit={job.reset} /> : main} sidebar={sidebar} active={!!doc} />;
}

function PageCard({
  docId,
  slot,
  position,
  onRotate,
}: {
  docId: string;
  slot: PageSlot;
  position: number;
  onRotate: (degrees: 90 | -90) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.page,
  });
  // A quarter turn swaps the 3:4 preview's width and height, so shrink it to stay inside the card.
  const sideways = slot.rotate === 90 || slot.rotate === 270;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`Page ${slot.page}, position ${position}${slot.rotate ? `, rotated ${slot.rotate} degrees` : ""}. Press space to move.`}
        className="cursor-grab touch-manipulation overflow-hidden bg-muted outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset active:cursor-grabbing"
      >
        <div
          className="transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: `rotate(${slot.rotate}deg) scale(${sideways ? 0.75 : 1})` }}
        >
          <PageThumbnail docId={docId} pageIndex={slot.page - 1} />
        </div>
      </div>
      <div className="flex h-8 items-center gap-0.5 border-t border-border px-1 font-mono text-xs">
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span
          className={cn("mr-auto tabular", position !== slot.page && "font-medium text-primary")}
          title={position !== slot.page ? `Moved — originally page ${slot.page}` : undefined}
        >
          {position}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Rotate page ${slot.page} left`}
          onClick={() => onRotate(-90)}
        >
          <RotateCcw />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Rotate page ${slot.page} right`}
          onClick={() => onRotate(90)}
        >
          <RotateCw />
        </Button>
      </div>
    </div>
  );
}
