import { useRef, useState } from "react";
import { Check } from "lucide-react";

import { PdfOutputPreview } from "@/features/pdf/components/output-preview";
import { PageThumbnail } from "@/features/pdf/components/page-thumbnail";
import { PageGrid, SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import {
  ActionPanel,
  FileRow,
  Panel,
  ResultPanel,
  Segmented,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJob } from "@/hooks/use-job";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { downloadFile, type OutputFile } from "@/lib/download";
import { baseName, plural } from "@/lib/format";
import { extractFromFile } from "@/features/pdf/lib/engine";
import { formatRanges, parseRanges } from "@/features/pdf/lib/page-ranges";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-extract");

type Action = "keep" | "remove";

export function ExtractTool() {
  const documents = usePdfDocuments({ multiple: false });
  const job = useJob<OutputFile & { pageCount: number }>();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>("keep");
  const anchor = useRef<number | null>(null);

  const doc = documents.documents[0];
  const pageCount = doc?.status === "ready" ? (doc.pageCount ?? 0) : 0;

  const applySelection = (next: Set<number>) => {
    setSelected(next);
    setRangeText(formatRanges(next));
    setRangeError(null);
    job.reset();
  };

  const onPageClick = (page: number, event: React.MouseEvent) => {
    const next = new Set(selected);
    if (event.shiftKey && anchor.current !== null) {
      const [from, to] = [anchor.current, page].sort((a, b) => a - b);
      for (let p = from; p <= to; p++) next.add(p);
    } else if (next.has(page)) {
      next.delete(page);
    } else {
      next.add(page);
    }
    anchor.current = page;
    applySelection(next);
  };

  const selectWhere = (predicate: (page: number) => boolean) => {
    const next = new Set<number>();
    for (let page = 1; page <= pageCount; page++) if (predicate(page)) next.add(page);
    anchor.current = null;
    applySelection(next);
  };

  const onRangeChange = (text: string) => {
    setRangeText(text);
    job.reset();
    if (!text.trim()) {
      setSelected(new Set());
      setRangeError(null);
      return;
    }
    const parsed = parseRanges(text, pageCount);
    if (parsed.ok) {
      setSelected(new Set(parsed.groups.flat()));
      setRangeError(null);
    } else {
      setRangeError(parsed.error);
    }
  };

  const documentsApi = {
    ...documents,
    add: (files: File[]) => {
      job.reset();
      setSelected(new Set());
      setRangeText("");
      setRangeError(null);
      documents.add(files);
    },
    clear: () => {
      job.reset();
      setSelected(new Set());
      setRangeText("");
      documents.clear();
    },
  };

  const outputPages =
    action === "keep"
      ? [...selected].sort((a, b) => a - b)
      : Array.from({ length: pageCount }, (_, i) => i + 1).filter((page) => !selected.has(page));

  const disabledReason = !pageCount
    ? "Add a PDF first."
    : selected.size === 0
      ? `Select the pages to ${action}.`
      : outputPages.length === 0
        ? "You can’t remove every page."
        : null;

  const run = () => {
    if (!doc) return;
    const pages = outputPages;
    void job.run(async () => ({
      name: `${baseName(doc.file.name)}-${action === "keep" ? "extracted" : "edited"}.pdf`,
      bytes: await extractFromFile({ file: doc.file, password: doc.password }, pages),
      pageCount: pages.length,
    }));
  };

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(ready) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-medium">
              {selected.size ? `${selected.size} of ${ready.pageCount} selected` : "Click pages to select"}
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                Shift-click selects a range
              </span>
            </p>
            {(
              [
                ["All", () => true],
                ["Odd", (p: number) => p % 2 === 1],
                ["Even", (p: number) => p % 2 === 0],
                ["Invert", (p: number) => !selected.has(p)],
                ["None", () => false],
              ] as const
            ).map(([label, predicate]) => (
              <Button key={label} variant="outline" size="sm" onClick={() => selectWhere(predicate)}>
                {label}
              </Button>
            ))}
          </div>
          <PageGrid>
            {Array.from({ length: ready.pageCount }, (_, index) => {
              const page = index + 1;
              const isSelected = selected.has(page);
              const dimmed = action === "remove" ? isSelected : selected.size > 0 && !isSelected;
              return (
                <button
                  key={page}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Page ${page}`}
                  onClick={(event) => onPageClick(page, event)}
                  className={cn(
                    "group relative select-none overflow-hidden rounded-lg border bg-card text-left shadow-xs transition-[border-color,box-shadow,transform] outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    isSelected
                      ? action === "keep"
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-danger ring-2 ring-danger/25"
                      : "border-border hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
                  )}
                >
                  <PageThumbnail
                    docId={ready.id}
                    pageIndex={index}
                    className={cn("transition-opacity", dimmed && "opacity-40")}
                  />
                  <div
                    className={cn(
                      "flex h-7 items-center justify-between border-t border-border px-2 font-mono text-xs font-medium",
                      isSelected && (action === "keep" ? "bg-primary text-primary-foreground" : "bg-danger text-danger-foreground")
                    )}
                  >
                    <span>{page}</span>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        isSelected ? "border-current" : "border-border-strong bg-card"
                      )}
                    >
                      {isSelected && <Check className="size-3" strokeWidth={4} />}
                    </span>
                  </div>
                  {isSelected && action === "remove" && (
                    <span className="absolute inset-x-0 top-1/3 mx-auto w-fit -rotate-12 rounded-md bg-danger px-2 py-0.5 font-mono text-[11px] font-medium tracking-wider text-danger-foreground uppercase shadow-md">
                      Removed
                    </span>
                  )}
                </button>
              );
            })}
          </PageGrid>
        </div>
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;

  const sidebar = result ? (
    <ResultPanel
      title="Your new PDF is ready"
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
      <Panel title="Selected pages">
        <div className="space-y-4">
          <Segmented
            label="What to do with the selected pages"
            value={action}
            onChange={(next) => {
              setAction(next);
              job.reset();
            }}
            options={[
              { value: "keep", label: "Extract" },
              { value: "remove", label: "Remove" },
            ]}
          />
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium">Pages</span>
            <Input
              placeholder="e.g. 1-3, 5, 8-z"
              value={rangeText}
              disabled={!pageCount}
              aria-invalid={!!rangeError}
              onChange={(event) => onRangeChange(event.target.value)}
            />
            <span className={cn("block text-xs", rangeError ? "font-medium text-danger" : "text-muted-foreground")}>
              {rangeError ?? "Type ranges or click pages. “z” means the last page."}
            </span>
          </label>
          {pageCount > 0 && selected.size > 0 && outputPages.length > 0 && (
            <p className="border-t border-border pt-3 text-sm text-muted-foreground">
              New PDF with <strong className="text-foreground">{plural(outputPages.length, "page")}</strong>, in original order.
            </p>
          )}
        </div>
      </Panel>
      <ActionPanel
        label={
          selected.size
            ? action === "keep"
              ? `Extract ${plural(selected.size, "page")}`
              : `Remove ${plural(selected.size, "page")}`
            : action === "keep"
              ? "Extract pages"
              : "Remove pages"
        }
        disabledReason={disabledReason}
        job={job.state}
        onRun={run}
      />
    </>
  );

  return <ToolLayout main={result ? <PdfOutputPreview files={[result]} onEdit={job.reset} /> : main} sidebar={sidebar} active={!!doc} />;
}
