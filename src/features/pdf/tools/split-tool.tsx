import { useMemo, useState } from "react";
import { Scissors } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { useJob } from "@/hooks/use-job";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { downloadFile, downloadZip, type OutputFile } from "@/lib/download";
import { baseName, plural } from "@/lib/format";
import { splitFile } from "@/features/pdf/lib/engine";
import {
  chunkPages,
  cutsToGroups,
  describeGroup,
  groupsToCuts,
  parseRanges,
  type RangeParseResult,
} from "@/features/pdf/lib/page-ranges";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-split");

type Mode = "every" | "custom";

/** Light tints that stay readable with dark text in both themes. */
const GROUP_COLORS = ["bg-sky-200", "bg-amber-200", "bg-emerald-200", "bg-rose-200", "bg-violet-200"];

function groupColor(index: number) {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

function outputName(base: string, group: number[]) {
  const label = describeGroup(group).replace(/,\s*/g, "_");
  return `${base}-${group.length === 1 ? "page" : "pages"}-${label}.pdf`;
}

export function SplitTool() {
  const documents = usePdfDocuments({ multiple: false });
  const job = useJob<{ files: (OutputFile & { pageCount: number })[]; zipName: string }>('pdf_split');
  const [mode, setMode] = useState<Mode>("every");
  const [chunkSize, setChunkSize] = useState(1);
  const [rangeText, setRangeText] = useState("");

  const doc = documents.documents[0];
  const pageCount = doc?.status === "ready" ? (doc.pageCount ?? 0) : 0;

  const parsed: RangeParseResult = useMemo(() => {
    if (!pageCount) return { ok: false, error: "" };
    if (mode === "every") return { ok: true, groups: chunkPages(pageCount, chunkSize) };
    return parseRanges(rangeText, pageCount);
  }, [chunkSize, mode, pageCount, rangeText]);

  const groups = useMemo(() => (parsed.ok ? parsed.groups : []), [parsed]);

  /** Group index for each page (first group that contains it). */
  const pageGroup = useMemo(() => {
    const map = new Map<number, number>();
    groups.forEach((group, index) =>
      group.forEach((page) => {
        if (!map.has(page)) map.set(page, index);
      })
    );
    return map;
  }, [groups]);

  const cuts = useMemo(
    () => (pageCount ? groupsToCuts(groups, pageCount) : null),
    [groups, pageCount]
  );

  const resetOutput = () => job.reset();

  const toggleCut = (afterPage: number) => {
    const next = new Set(cuts ?? []);
    if (next.has(afterPage)) next.delete(afterPage);
    else next.add(afterPage);
    setMode("custom");
    setRangeText(cutsToGroups(next, pageCount).map(describeGroup).join(", "));
    resetOutput();
  };

  const switchMode = (next: Mode) => {
    if (next === "custom" && mode === "every" && pageCount) {
      setRangeText(groups.map(describeGroup).join(", "));
    }
    setMode(next);
    resetOutput();
  };

  const documentsApi = {
    ...documents,
    add: (files: File[]) => {
      resetOutput();
      setRangeText("");
      setMode("every");
      documents.add(files);
    },
    clear: () => {
      resetOutput();
      documents.clear();
    },
  };

  const run = () => {
    if (!doc) return;
    const base = baseName(doc.file.name);
    void job.run(async (progress) => {
      const outputs = await splitFile({ file: doc.file, password: doc.password }, groups, progress);
      return {
        zipName: `${base}-split.zip`,
        files: outputs.map((bytes, index) => ({
          name: outputName(base, groups[index]),
          bytes,
          pageCount: groups[index].length,
        })),
      };
    });
  };

  const disabledReason = !pageCount
    ? "Add a PDF to split."
    : !parsed.ok
      ? "Fix the page ranges first."
      : groups.length === 1 && groups[0].length === pageCount
        ? "Add a cut or choose a smaller chunk size."
        : null;

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(ready) => (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Click <Scissors className="inline size-3.5" /> between pages to add or remove a cut.
            Colors show which file each page goes into.
          </p>
          <PageGrid className="pr-5">
            {Array.from({ length: ready.pageCount }, (_, index) => {
              const page = index + 1;
              const group = pageGroup.get(page);
              const startsGroup = group !== undefined && groups[group][0] === page;
              const isCut = cuts?.has(page) ?? false;
              return (
                <div key={page} className="relative">
                  <div
                    className={cn(
                      "overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-opacity",
                      group === undefined && "opacity-35"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 items-center justify-between border-b border-border px-2 font-mono text-[11px] font-medium",
                        group === undefined ? "bg-muted text-muted-foreground" : groupColor(group),
                        group !== undefined && "text-neutral-900"
                      )}
                    >
                      <span>{startsGroup ? `File ${group + 1}` : ""}</span>
                      <span>{page}</span>
                    </div>
                    <PageThumbnail docId={ready.id} pageIndex={index} />
                  </div>
                  {page < ready.pageCount && (
                    <button
                      type="button"
                      aria-pressed={isCut}
                      aria-label={isCut ? `Remove cut after page ${page}` : `Cut after page ${page}`}
                      title={isCut ? "Remove cut" : "Cut here"}
                      onClick={() => toggleCut(page)}
                      className={cn(
                        "absolute top-1/2 -right-5 z-10 flex h-16 w-5 -translate-y-1/2 items-center justify-center transition-all",
                        "before:absolute before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:border-l-2 before:border-dashed",
                        isCut
                          ? "before:border-primary before:border-solid"
                          : "before:border-transparent hover:before:border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "relative flex size-6 items-center justify-center rounded-full border border-border-strong shadow-xs transition-colors",
                          isCut
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground hover:border-primary hover:text-primary"
                        )}
                      >
                        <Scissors className="size-3.5" />
                      </span>
                    </button>
                  )}
                </div>
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
      title={`${plural(result.files.length, "file")} ready`}
      downloadLabel={result.files.length > 1 ? "Download all (.zip)" : "Download"}
      onDownload={() =>
        result.files.length > 1
          ? void downloadZip(result.files, result.zipName)
          : downloadFile(result.files[0])
      }
      onStartOver={documentsApi.clear}
    >
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {result.files.map((file) => (
          <FileRow
            key={file.name}
            name={file.name}
            detail={outputDetail(file.bytes, file.pageCount)}
            onDownload={() => downloadFile(file)}
          />
        ))}
      </div>
    </ResultPanel>
  ) : (
    <>
      <Panel title="Split by">
        <div className="space-y-4">
          <Segmented
            label="Split mode"
            value={mode}
            onChange={switchMode}
            options={[
              { value: "every", label: "Every N pages" },
              { value: "custom", label: "Custom ranges" },
            ]}
          />
          {mode === "every" ? (
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium">Pages per file</span>
              <Input
                type="number"
                min={1}
                max={pageCount || undefined}
                inputMode="numeric"
                value={chunkSize}
                onChange={(event) => {
                  setChunkSize(Math.max(1, Math.floor(Number(event.target.value)) || 1));
                  resetOutput();
                }}
              />
              <span className="block text-xs text-muted-foreground">
                1 = every page becomes its own PDF.
              </span>
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium">Ranges — one file each</span>
              <Input
                placeholder="e.g. 1-3, 4-8, 9-z"
                value={rangeText}
                aria-invalid={!!pageCount && !parsed.ok}
                onChange={(event) => {
                  setRangeText(event.target.value);
                  resetOutput();
                }}
              />
              <span
                className={cn(
                  "block text-xs",
                  pageCount && !parsed.ok && rangeText ? "font-medium text-danger" : "text-muted-foreground"
                )}
              >
                {pageCount && !parsed.ok && rangeText
                  ? parsed.error
                  : "Comma-separated. “z” means the last page."}
              </span>
            </label>
          )}
          {pageCount > 0 && parsed.ok && (
            <p className="border-t border-border pt-3 text-sm text-muted-foreground">
              Creates <strong className="text-foreground">{plural(groups.length, "PDF")}</strong>
              {groups.length > 1 && ", downloaded as a ZIP"}.
            </p>
          )}
        </div>
      </Panel>
      <ActionPanel
        label={groups.length > 1 ? `Split into ${plural(groups.length, "PDF")}` : "Split PDF"}
        disabledReason={disabledReason}
        job={job.state}
        onRun={run}
      />
    </>
  );

  return <ToolLayout main={result ? <PdfOutputPreview files={result.files} onEdit={job.reset} /> : main} sidebar={sidebar} active={!!doc} />;
}
