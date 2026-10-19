import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageDown } from "lucide-react";

import {
  ActionPanel,
  Field,
  FileRow,
  Message,
  Panel,
  ResultPanel,
  Segmented,
  Slider,
  ToolLayout,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagesOutputPreview } from "@/features/pdf/components/images-output-preview";
import { PageThumbnail } from "@/features/pdf/components/page-thumbnail";
import { PageGrid, SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { getPageSize, renderPagesAsImages } from "@/features/pdf/lib/engine";
import { formatRanges, parseRanges } from "@/features/pdf/lib/page-ranges";
import { useJob } from "@/hooks/use-job";
import { downloadBlob, downloadZip } from "@/lib/download";
import { baseName, formatBytes, plural } from "@/lib/format";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-to-images");

type Format = "png" | "jpeg";

const RESOLUTIONS = [
  { value: 72, label: "72", note: "Screen · small files" },
  { value: 150, label: "150", note: "Good for most uses" },
  { value: 300, label: "300", note: "Print quality" },
] as const;

/** All the rendered images are held in memory at once, so keep a ceiling on their total size. */
const MAX_TOTAL_PIXELS = 700_000_000;

type Result = { files: { name: string; bytes: Uint8Array }[]; format: Format; zipName: string };

export function ToImagesTool() {
  const documents = usePdfDocuments({ multiple: false });
  const job = useJob<Result>();
  const [format, setFormat] = useState<Format>("png");
  const [dpi, setDpi] = useState<number>(150);
  const [quality, setQuality] = useState(90);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [sizes, setSizes] = useState<{ docId: string; width: number; height: number } | null>(null);
  const anchor = useRef<number | null>(null);

  const doc = documents.documents[0];
  const ready = doc?.status === "ready";
  const pageCount = ready ? (doc.pageCount ?? 0) : 0;

  const docId = ready ? doc.id : null;
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    getPageSize(docId, 0).then(
      ([width, height]) => !cancelled && setSizes({ docId, width, height }),
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [docId]);
  const firstPage = sizes && sizes.docId === docId ? sizes : null;

  const pages = useMemo(
    () =>
      selected.size
        ? [...selected].sort((a, b) => a - b)
        : Array.from({ length: pageCount }, (_, index) => index + 1),
    [selected, pageCount]
  );

  const pixelsPerPage = firstPage ? firstPage.width * firstPage.height * (dpi / 72) ** 2 : 0;
  const tooBig = pixelsPerPage * pages.length > MAX_TOTAL_PIXELS;

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

  const reset = () => {
    job.reset();
    setSelected(new Set());
    setRangeText("");
    setRangeError(null);
    anchor.current = null;
  };

  const documentsApi = {
    ...documents,
    add: (files: File[]) => {
      reset();
      documents.add(files);
    },
    clear: () => {
      reset();
      documents.clear();
    },
  };

  const disabledReason = !pageCount
    ? "Add a PDF first."
    : rangeError
      ? "Fix the page range first."
      : tooBig
        ? "Too many pages at this resolution. Pick fewer pages or lower the resolution."
        : null;

  const run = () => {
    if (!doc) return;
    const base = baseName(doc.file.name);
    const extension = format === "png" ? "png" : "jpg";
    const width = String(pageCount).length;
    void job.run(async (progress) => {
      const images = await renderPagesAsImages(
        { file: doc.file, password: doc.password },
        pages,
        { dpi, format, quality },
        progress
      );
      return {
        files: images.map((bytes, index) => ({
          name: `${base}-page-${String(pages[index]).padStart(width, "0")}.${extension}`,
          bytes,
        })),
        format,
        zipName: `${base}-images.zip`,
      };
    });
  };

  const download = (result: Result) => {
    if (result.files.length === 1) {
      const [file] = result.files;
      downloadBlob(
        new Blob([file.bytes as BlobPart], { type: result.format === "png" ? "image/png" : "image/jpeg" }),
        file.name
      );
    } else {
      void downloadZip(result.files, result.zipName);
    }
  };

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(opened) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-medium">
              {selected.size ? `${selected.size} of ${opened.pageCount} selected` : `All ${opened.pageCount} pages`}
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                Click pages to choose which to export
              </span>
            </p>
            <Button variant="outline" size="sm" disabled={!selected.size} onClick={() => applySelection(new Set())}>
              All pages
            </Button>
          </div>
          <PageGrid>
            {Array.from({ length: opened.pageCount }, (_, index) => {
              const page = index + 1;
              const isSelected = selected.has(page);
              const included = !selected.size || isSelected;
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
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
                  )}
                >
                  <PageThumbnail
                    docId={opened.id}
                    pageIndex={index}
                    className={cn("transition-opacity", !included && "opacity-40")}
                  />
                  <div
                    className={cn(
                      "flex h-7 items-center justify-between border-t border-border px-2 font-mono text-xs font-medium",
                      isSelected && "bg-primary text-primary-foreground"
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
                </button>
              );
            })}
          </PageGrid>
        </div>
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;
  const totalBytes = result ? result.files.reduce((sum, file) => sum + file.bytes.length, 0) : 0;

  const sidebar = result ? (
    <ResultPanel
      title={result.files.length === 1 ? "Your image is ready" : "Your images are ready"}
      downloadLabel={result.files.length === 1 ? "Download image" : "Download ZIP"}
      onDownload={() => download(result)}
      onStartOver={documentsApi.clear}
    >
      <FileRow
        name={result.files.length === 1 ? result.files[0].name : result.zipName}
        detail={`${plural(result.files.length, "image")} · ${formatBytes(totalBytes)}`}
        icon={<ImageDown className="size-4" />}
        onDownload={() => download(result)}
      />
    </ResultPanel>
  ) : (
    <>
      <Panel title="Image settings">
        <div className="space-y-4">
          <Field label="Format">
            <Segmented<Format>
              label="Image format"
              value={format}
              onChange={(next) => {
                setFormat(next);
                job.reset();
              }}
              options={[
                { value: "png", label: "PNG", title: "Lossless, larger files" },
                { value: "jpeg", label: "JPG", title: "Smaller files, great for photos" },
              ]}
            />
          </Field>
          <Field
            label="Resolution (dpi)"
            hint={RESOLUTIONS.find((option) => option.value === dpi)?.note}
          >
            <Segmented<string>
              label="Resolution"
              value={String(dpi)}
              onChange={(next) => {
                setDpi(Number(next));
                job.reset();
              }}
              options={RESOLUTIONS.map((option) => ({ value: String(option.value), label: option.label }))}
            />
          </Field>
          {format === "jpeg" && (
            <Slider
              label="JPG quality"
              value={quality}
              min={40}
              max={100}
              onChange={(next) => {
                setQuality(next);
                job.reset();
              }}
            />
          )}
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium">Pages</span>
            <Input
              placeholder="All pages, or e.g. 1-3, 5, 8-z"
              value={rangeText}
              disabled={!pageCount}
              aria-invalid={!!rangeError}
              onChange={(event) => onRangeChange(event.target.value)}
            />
            <span className={cn("block text-xs", rangeError ? "font-medium text-danger" : "text-muted-foreground")}>
              {rangeError ?? "Leave blank to export every page."}
            </span>
          </label>
          {firstPage && (
            <p className="border-t border-border pt-3 text-sm text-muted-foreground">
              {plural(pages.length, "image")} of about{" "}
              <strong className="font-mono text-foreground">
                {Math.round((firstPage.width * dpi) / 72)}×{Math.round((firstPage.height * dpi) / 72)}
              </strong>{" "}
              px.
            </p>
          )}
        </div>
      </Panel>
      {tooBig && !rangeError && (
        <Message tone="error">
          That’s a lot of pixels for one browser tab. Choose fewer pages or a lower resolution.
        </Message>
      )}
      <ActionPanel
        label={pageCount ? `Export ${plural(pages.length, "page")}` : "Export pages"}
        disabledReason={disabledReason}
        job={job.state}
        onRun={run}
      />
    </>
  );

  return <ToolLayout main={result ? <ImagesOutputPreview files={result.files} mime={result.format === "png" ? "image/png" : "image/jpeg"} onEdit={job.reset} /> : main} sidebar={sidebar} active={!!doc} />;
}
