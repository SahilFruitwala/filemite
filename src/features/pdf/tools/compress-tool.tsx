import { useState } from "react";

import { PageThumbnail } from "@/features/pdf/components/page-thumbnail";
import { SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import {
  ActionPanel,
  Checkbox,
  ChoiceList,
  Message,
  ResultPanel,
  Segmented,
  SizeBar,
  ToolLayout,
} from "@/components/tool/tool-ui";
import { Input } from "@/components/ui/input";
import { useJob } from "@/hooks/use-job";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { downloadFile, type OutputFile } from "@/lib/download";
import { baseName, formatBytes, plural } from "@/lib/format";
import { COMPRESS_PRESETS, type CompressLevel } from "@/features/pdf/lib/compress-presets";
import { compressFile, compressFileToTarget } from "@/features/pdf/lib/engine";
import type { CompressStats } from "@/features/pdf/lib/operations";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-compress");

type Mode = "quality" | "size";

const LEVELS: { id: CompressLevel; label: string; description: string }[] = [
  {
    id: "light",
    label: "Light",
    description: "Looks identical to the original. Images stay sharp enough for print.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Best for sharing and email. Black-and-white scans become crisp 1-bit pages.",
  },
  {
    id: "strong",
    label: "Strong",
    description: "Smallest file. Photos get softer; text and graphics stay sharp.",
  },
];

const MB = 1024 * 1024;
const SIZE_PRESETS = [1, 2, 5, 10];

/** Treat anything under 2% savings as "already optimized". */
const MEANINGFUL_SAVINGS = 0.02;

type CompressResult = OutputFile & {
  originalSize: number;
  stats: CompressStats;
  target?: { bytes: number; fits: boolean };
};

function defaultTargetMb(fileSize: number) {
  const below = SIZE_PRESETS.filter((mb) => mb * MB < fileSize);
  if (below.length) return below[below.length - 1];
  return Math.max(0.1, Math.round((fileSize / MB / 2) * 10) / 10);
}

function describeWork(stats: CompressStats): string[] {
  const lines: string[] = [];
  const { jpeg, palette, lossless, bilevel } = stats.encodings;
  if (jpeg) lines.push(`${plural(jpeg, "photo")} re-encoded for the size shown`);
  if (palette + lossless) lines.push(`${plural(palette + lossless, "graphic")} compressed without visible loss`);
  if (bilevel) lines.push(`${plural(bilevel, "scanned page")} converted to sharp black & white`);
  if (stats.fontsSubset && stats.fontsEmbedded) lines.push("Fonts trimmed to the characters used");
  if (stats.streamsOptimized) lines.push("Vector drawings tidied");
  return lines;
}

export function CompressTool() {
  const documents = usePdfDocuments({ multiple: false });
  const job = useJob<CompressResult>();
  const [mode, setMode] = useState<Mode>("quality");
  const [level, setLevel] = useState<CompressLevel>("balanced");
  const [grayscale, setGrayscale] = useState(false);
  const [targetMb, setTargetMb] = useState<number | null>(null);

  const doc = documents.documents[0];
  const ready = doc?.status === "ready";
  const target = targetMb ?? (doc ? defaultTargetMb(doc.file.size) : 2);
  const targetBytes = Math.round(target * MB);

  const documentsApi = {
    ...documents,
    add: (files: File[]) => {
      job.reset();
      setTargetMb(null);
      documents.add(files);
    },
    clear: () => {
      job.reset();
      setTargetMb(null);
      documents.clear();
    },
  };

  const run = () => {
    if (!doc) return;
    const file = { file: doc.file, password: doc.password };
    const name = `${baseName(doc.file.name)}-compressed.pdf`;
    void job.run(async (progress) => {
      if (mode === "size") {
        const result = await compressFileToTarget(file, targetBytes, grayscale, progress);
        return {
          name,
          bytes: result.bytes,
          stats: result.stats,
          originalSize: doc.file.size,
          target: { bytes: targetBytes, fits: result.fitsTarget },
        };
      }
      const result = await compressFile(file, { ...COMPRESS_PRESETS[level], grayscale }, progress);
      return { name, bytes: result.bytes, stats: result.stats, originalSize: doc.file.size };
    });
  };

  const disabledReason = !ready
    ? "Add a PDF to compress."
    : mode === "size" && !(targetBytes > 0)
      ? "Enter a target size."
      : mode === "size" && targetBytes >= doc.file.size
        ? `This file is already under ${formatBytes(targetBytes)}.`
        : null;

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(readyDoc) => (
        <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <div className="hidden self-start overflow-hidden rounded-lg border border-border bg-card shadow-sm sm:block">
            <PageThumbnail docId={readyDoc.id} pageIndex={0} />
          </div>
          <div className="space-y-4">
            <Segmented
              label="Compression mode"
              value={mode}
              onChange={(next) => {
                setMode(next);
                job.reset();
              }}
              options={[
                { value: "quality", label: "By quality" },
                { value: "size", label: "To a file size" },
              ]}
            />

            {mode === "quality" ? (
              <ChoiceList
                label="Compression level"
                value={level}
                onChange={(next) => {
                  setLevel(next);
                  job.reset();
                }}
                options={LEVELS.map((item) => ({
                  value: item.id,
                  label: item.label,
                  description: item.description,
                  badge: item.id === "balanced" ? "Recommended" : undefined,
                }))}
              />
            ) : (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <label className="block space-y-1.5">
                  <span className="text-[13px] font-medium">Make it smaller than</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0.1}
                      step={0.1}
                      className="w-28 font-mono"
                      value={target}
                      onChange={(event) => {
                        setTargetMb(Math.max(0, Number(event.target.value)));
                        job.reset();
                      }}
                    />
                    <span className="text-sm text-muted-foreground">MB</span>
                  </div>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_PRESETS.map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => {
                        setTargetMb(mb);
                        job.reset();
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                        target === mb
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
                      )}
                    >
                      {mb} MB
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Keeps as much quality as fits. Currently {formatBytes(readyDoc.file.size)}.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <Checkbox
                checked={grayscale}
                onChange={(checked) => {
                  setGrayscale(checked);
                  job.reset();
                }}
                label="Convert images to grayscale"
                description="Great for scanned documents. Text and drawings keep their colors."
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Text stays sharp and searchable. Each image gets the best format for its content — photos
              are sized for how large they appear, charts and screenshots keep crisp edges, and
              black-and-white scans become 1-bit — and hidden editor data and unused font
              characters are removed.
            </p>
          </div>
        </div>
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;
  const savings = result ? 1 - result.bytes.length / result.originalSize : 0;
  const worthwhile = savings >= MEANINGFUL_SAVINGS;

  const sidebar = result ? (
    <ResultPanel
      title={worthwhile ? `${Math.min(99, Math.round(savings * 100))}% smaller` : "Already optimized"}
      onDownload={worthwhile ? () => downloadFile(result) : undefined}
      onStartOver={documentsApi.clear}
    >
      {worthwhile ? (
        <>
          <div className="space-y-2 text-sm">
            <SizeBar label="Before" bytes={result.originalSize} fraction={1} />
            <SizeBar label="After" bytes={result.bytes.length} fraction={1 - savings} highlight />
          </div>
          {result.target &&
            (result.target.fits ? (
              <Message tone="success">Fits under {formatBytes(result.target.bytes)}.</Message>
            ) : (
              <Message tone="info">
                Couldn’t get under {formatBytes(result.target.bytes)} without making it unreadable —
                this is the smallest it gets.
              </Message>
            ))}
          {describeWork(result.stats).length > 0 && (
            <ul className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              {describeWork(result.stats).map((line) => (
                <li key={line} className="flex gap-2"><span className="text-primary">✓</span>{line}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <Message tone="info">
          This PDF is already compact — compressing it would save less than 2%, so there’s
          nothing worth downloading.
          {mode === "quality" && level !== "strong" && " Try the Strong level for more savings."}
        </Message>
      )}
    </ResultPanel>
  ) : (
    <ActionPanel
      label={mode === "size" ? `Compress to ${formatBytes(targetBytes)}` : "Compress PDF"}
      disabledReason={disabledReason}
      job={job.state}
      onRun={run}
      animation="squish"
    />
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!doc} />;
}

