import { PdfOutputPreview } from "@/features/pdf/components/output-preview";
import { useState } from "react";
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
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownAZ, FileUp, GripVertical, Loader2, Trash2, X } from "lucide-react";

import { AddFilesButton, DropTarget, FileDrop } from "@/components/tool/file-drop";
import { PageThumbnail } from "@/features/pdf/components/page-thumbnail";
import { PasswordForm } from "@/features/pdf/components/password-form";
import {
  ActionPanel,
  Checkbox,
  FileRow,
  Message,
  Panel,
  ResultPanel,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { useJob } from "@/hooks/use-job";
import {
  MAX_FILES,
  PDF_ACCEPT,
  PDF_HINT_MULTIPLE,
  usePdfDocuments,
  type PdfDocument,
} from "@/features/pdf/hooks/use-pdf-documents";
import { downloadFile, type OutputFile } from "@/lib/download";
import { formatBytes, plural } from "@/lib/format";
import { mergeFiles } from "@/features/pdf/lib/engine";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-merge");

type MergeResult = OutputFile & { pageCount: number };

export function MergeTool() {
  const documents = usePdfDocuments({ multiple: true });
  const { documents: docs, setDocuments } = documents;
  const [bookmarks, setBookmarks] = useState(true);
  const job = useJob<MergeResult>('pdf_merge');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch screens a swipe should still scroll the page: press and hold to pick a card up.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const totalPages = docs.reduce((sum, doc) => sum + (doc.pageCount ?? 0), 0);

  // Any change to the inputs makes a previous result stale.
  const withReset =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      job.reset();
      fn(...args);
    };

  const onDragEnd = withReset((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDocuments((items) => {
      const from = items.findIndex((item) => item.id === active.id);
      const to = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, from, to);
    });
  });

  const disabledReason = (() => {
    if (docs.length < 2) return docs.length ? "Add at least one more PDF." : "Add two or more PDFs.";
    if (docs.some((doc) => doc.status === "opening")) return "Opening files…";
    if (docs.some((doc) => doc.status === "locked")) return "Unlock password-protected files first.";
    if (docs.some((doc) => doc.status === "error")) return "Remove files that couldn’t be opened.";
    return null;
  })();

  const run = () =>
    job.run(async (progress) => {
      const bytes = await mergeFiles(
        docs.map((doc) => ({ file: doc.file, password: doc.password })),
        { bookmarks },
        progress
      );
      return { name: "merged.pdf", bytes, pageCount: totalPages };
    });

  const add = withReset(documents.add);

  const main =
    docs.length === 0 ? (
      <div className="space-y-3">
        <FileDrop
          accept={PDF_ACCEPT}
          multiple
          onFiles={add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose PDFs"
          hint={PDF_HINT_MULTIPLE}
          icon={FileUp}
        />
        {documents.notice && <Message tone="error">{documents.notice}</Message>}
      </div>
    ) : (
      <DropTarget onFiles={add} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium">
            {plural(docs.length, "file")} · {plural(totalPages, "page")}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {docs.length}/{MAX_FILES}
            </span>
          </p>
          <Button
            variant="ghost"
            onClick={withReset(() =>
              setDocuments((items) =>
                [...items].sort((a, b) =>
                  a.file.name.localeCompare(b.file.name, undefined, { numeric: true })
                )
              )
            )}
          >
            <ArrowDownAZ />
            Sort by name
          </Button>
          <Button variant="ghost" onClick={withReset(documents.clear)}>
            <Trash2 />
            Clear
          </Button>
          {docs.length < MAX_FILES && (
            <AddFilesButton accept={PDF_ACCEPT} multiple onFiles={add} label="Add PDFs" />
          )}
        </div>

        {documents.notice && <Message tone="error">{documents.notice}</Message>}

        <p className="text-xs text-muted-foreground">
          <span className="[@media(hover:none)]:hidden">Drag cards</span>
          <span className="hidden [@media(hover:none)]:inline">Press and hold a card, then drag it</span>{" "}
          to change the order — files are combined left to right, top to bottom.
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={docs.map((doc) => doc.id)} strategy={rectSortingStrategy}>
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
              {docs.map((doc, index) => (
                <MergeCard
                  key={doc.id}
                  doc={doc}
                  position={index + 1}
                  onRemove={withReset(() => documents.remove(doc.id))}
                  onUnlock={(password) => documents.unlock(doc.id, password)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </DropTarget>
    );

  const sidebar = (
    <>
      {job.state.status === "done" ? (
        <ResultPanel
          title="Merged!"
          onDownload={() => job.state.status === "done" && downloadFile(job.state.result)}
          onStartOver={() => {
            job.reset();
            documents.clear();
          }}
        >
          <FileRow
            name={job.state.result.name}
            detail={outputDetail(job.state.result.bytes, job.state.result.pageCount)}
            onDownload={() => job.state.status === "done" && downloadFile(job.state.result)}
          />
        </ResultPanel>
      ) : (
        <>
          <Panel title="Options">
            <Checkbox
              checked={bookmarks}
              onChange={withReset(setBookmarks)}
              label="Bookmark each file"
              description="Adds a bookmark per file and keeps each file’s own bookmarks."
            />
          </Panel>
          <ActionPanel
            label={docs.length >= 2 ? `Merge ${plural(docs.length, "PDF")}` : "Merge PDFs"}
            disabledReason={disabledReason}
            job={job.state}
            onRun={run}
          />
        </>
      )}
    </>
  );

  return <ToolLayout main={job.state.status === "done" ? <PdfOutputPreview files={[job.state.result]} onEdit={job.reset} /> : main} sidebar={sidebar} active={docs.length > 0} />;
}

function MergeCard({
  doc,
  position,
  onRemove,
  onUnlock,
}: {
  doc: PdfDocument;
  position: number;
  onRemove: () => void;
  onUnlock: (password: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: doc.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        isDragging && "z-10 rotate-1 shadow-lg ring-2 ring-primary/40"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${doc.file.name}, position ${position}. Press space to move.`}
        className="cursor-grab touch-manipulation outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] font-medium text-primary-foreground">
            {position}
          </span>
        </div>
        {doc.status === "ready" ? (
          <PageThumbnail docId={doc.id} pageIndex={0} alt={`First page of ${doc.file.name}`} />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground">
            {doc.status === "opening" && <Loader2 className="size-5 animate-spin" />}
            {doc.status === "locked" && "Password required"}
            {doc.status === "error" && <span className="text-danger">{doc.error}</span>}
          </div>
        )}
      </div>

      <div className="flex items-start gap-1 border-t border-border p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={doc.file.name}>
            {doc.file.name}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground tabular">
            {doc.pageCount !== undefined ? `${plural(doc.pageCount, "page")} · ` : ""}
            {formatBytes(doc.file.size)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${doc.file.name}`} onClick={onRemove}>
          <X />
        </Button>
      </div>

      {doc.status === "locked" && (
        <div className="border-t border-border p-2">
          <PasswordForm compact fileName={doc.file.name} error={doc.error} onSubmit={onUnlock} />
        </div>
      )}
    </li>
  );
}
