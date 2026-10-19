import { PdfOutputPreview } from "@/features/pdf/components/output-preview";
import { useState } from "react";
import { ArrowDownAZ, ImageUp, Trash2 } from "lucide-react";

import { AddFilesButton, DropTarget, FileDrop } from "@/components/tool/file-drop";
import {
  ActionPanel,
  Field,
  FileRow,
  Message,
  Panel,
  ResultPanel,
  Segmented,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { ImageSortGrid, type SortableImage } from "@/features/image/components/image-sort-grid";
import { BROWSER_IMAGE_HINT, BROWSER_IMAGE_TYPES, partitionImages, stem } from "@/features/image/lib/files";
import { imagesToPdfFile } from "@/features/pdf/lib/engine";
import {
  DEFAULT_IMAGE_PAGE_OPTIONS,
  type ImagePageOptions,
  type MarginChoice,
  type OrientationChoice,
  type PageSizeChoice,
} from "@/features/pdf/lib/image-pages";
import { imageForPdf } from "@/features/pdf/lib/image-input";
import { useJob } from "@/hooks/use-job";
import { downloadFile, type OutputFile } from "@/lib/download";
import { plural } from "@/lib/format";
import { MAX_BROWSER_IMAGE_BYTES } from "@/lib/limits";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-from-images");

const MAX_IMAGES = 50;

export function FromImagesTool() {
  const [images, setImages] = useState<SortableImage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [options, setOptions] = useState<ImagePageOptions>(DEFAULT_IMAGE_PAGE_OPTIONS);
  const job = useJob<OutputFile & { pageCount: number }>();

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files, "browser");
    const problems = problem ? [problem] : [];
    const big = accepted.filter((file) => file.size > MAX_BROWSER_IMAGE_BYTES);
    if (big.length) problems.push(`${plural(big.length, "image")} over 100 MB skipped.`);
    const usable = accepted.filter((file) => file.size <= MAX_BROWSER_IMAGE_BYTES);
    const room = Math.max(0, MAX_IMAGES - images.length);
    if (usable.length > room) problems.push(`Up to ${MAX_IMAGES} images — ${plural(usable.length - room, "image")} skipped.`);
    setNotice(problems.length ? problems.join(" ") : null);
    if (!usable.length || !room) return;
    job.reset();
    setImages((current) => [
      ...current,
      ...usable.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file, turn: 0 as const })),
    ]);
  };

  const change = (update: Partial<ImagePageOptions>) => {
    job.reset();
    setOptions((current) => ({ ...current, ...update }));
  };

  const edit = (next: SortableImage[]) => {
    job.reset();
    setImages(next);
  };

  const run = () =>
    job.run(async (progress) => {
      const prepared: Uint8Array[] = [];
      for (const [index, image] of images.entries()) {
        prepared.push(await imageForPdf(image.file, image.turn ?? 0));
        // Preparing is the slow part for redrawn images; building the pages is quick.
        progress(index + 1, images.length * 2);
      }
      const bytes = await imagesToPdfFile(prepared, options, (done, total) =>
        progress(images.length + (done / total) * images.length, images.length * 2)
      );
      return {
        name: `${images.length === 1 ? stem(images[0].file.name) : "images"}.pdf`,
        bytes,
        pageCount: images.length,
      };
    });

  const main =
    images.length === 0 ? (
      <div className="space-y-3">
        <FileDrop
          accept={BROWSER_IMAGE_TYPES}
          multiple
          onFiles={add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose images"
          hint={`${BROWSER_IMAGE_HINT} · up to ${MAX_IMAGES}`}
          icon={ImageUp}
        />
        {notice && <Message tone="error">{notice}</Message>}
      </div>
    ) : (
      <DropTarget onFiles={add} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium">
            {plural(images.length, "image")}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {images.length}/{MAX_IMAGES}
            </span>
          </p>
          <Button
            variant="ghost"
            onClick={() =>
              edit(
                [...images].sort((a, b) =>
                  a.file.name.localeCompare(b.file.name, undefined, { numeric: true }),
                ),
              )
            }
          >
            <ArrowDownAZ />
            Sort by name
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              job.reset();
              setImages([]);
              setNotice(null);
            }}
          >
            <Trash2 />
            Clear
          </Button>
          {images.length < MAX_IMAGES && (
            <AddFilesButton accept={BROWSER_IMAGE_TYPES} multiple onFiles={add} label="Add images" />
          )}
        </div>
        {notice && <Message tone="error">{notice}</Message>}
        <p className="text-xs text-muted-foreground">
          <span className="[@media(hover:none)]:hidden">Drag cards</span>
          <span className="hidden [@media(hover:none)]:inline">Press and hold a card, then drag it</span> to set
          the page order — one image per page.
        </p>
        <ImageSortGrid
          items={images}
          onReorder={edit}
          onRemove={(id) => edit(images.filter((image) => image.id !== id))}
          onTurn={(id, degrees) =>
            edit(
              images.map((image) =>
                image.id === id
                  ? { ...image, turn: ((((image.turn ?? 0) + degrees) % 360 + 360) % 360) as 0 | 90 | 180 | 270 }
                  : image,
              ),
            )
          }
          noun="Page"
        />
      </DropTarget>
    );

  const result = job.state.status === "done" ? job.state.result : null;

  const sidebar = result ? (
    <ResultPanel
      title="Your PDF is ready"
      onDownload={() => downloadFile(result)}
      onStartOver={() => {
        job.reset();
        setImages([]);
      }}
    >
      <FileRow name={result.name} detail={outputDetail(result.bytes, result.pageCount)} onDownload={() => downloadFile(result)} />
    </ResultPanel>
  ) : (
    <>
      <Panel title="Page setup">
        <div className="space-y-4">
          <Field label="Page size">
            <Segmented<PageSizeChoice>
              label="Page size"
              value={options.pageSize}
              onChange={(pageSize) => change({ pageSize })}
              options={[
                { value: "fit", label: "Fit image", title: "Each page is as big as its image" },
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
              ]}
            />
          </Field>
          {options.pageSize !== "fit" && (
            <Field label="Orientation">
              <Segmented<OrientationChoice>
                label="Orientation"
                value={options.orientation}
                onChange={(orientation) => change({ orientation })}
                options={[
                  { value: "auto", label: "Auto", title: "Turn each page to suit its image" },
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
            </Field>
          )}
          <Field label="Margin">
            <Segmented<MarginChoice>
              label="Margin"
              value={options.margin}
              onChange={(margin) => change({ margin })}
              options={[
                { value: "none", label: "None" },
                { value: "small", label: "Small" },
                { value: "large", label: "Large" },
              ]}
            />
          </Field>
        </div>
      </Panel>
      <ActionPanel
        label={images.length ? `Create PDF from ${plural(images.length, "image")}` : "Create PDF"}
        disabledReason={images.length ? null : "Add one or more images."}
        job={job.state}
        onRun={() => void run()}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        PNG and JPEG photos go in untouched, so there’s no quality loss. Rotated images and other
        formats are converted first.
      </p>
    </>
  );

  return <ToolLayout main={result ? <PdfOutputPreview files={[result]} onEdit={job.reset} /> : main} sidebar={sidebar} active={images.length > 0} />;
}
