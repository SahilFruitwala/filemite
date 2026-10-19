import { useState } from 'react';
import posthog from 'posthog-js';
import { AlertTriangle, Link2, Unlink2 } from 'lucide-react';

import {
  ActionPanel,
  Field,
  Panel,
  ResultPanel,
  Segmented,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Input } from '@/components/ui/input';
import { ImagePreview, SingleImageWorkspace } from '@/features/image/components/image-workspace';
import { postImageForm } from '@/features/image/lib/api';
import {
  ACCEPTED_IMAGE_TYPES,
  SERVER_IMAGE_HINT,
  extensionFor,
  partitionImages,
  stem,
  useImageSize,
  useObjectUrl,
} from '@/features/image/lib/files';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { MAX_OUTPUT_DIMENSION } from '@/lib/limits';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-resize');

type Fit = 'cover' | 'contain' | 'fill' | 'inside';

const PRESETS = [
  { label: 'Square', width: 1080, height: 1080 },
  { label: 'Story', width: 1080, height: 1920 },
  { label: 'Full HD', width: 1920, height: 1080 },
  { label: 'Link preview', width: 1200, height: 630 },
  { label: 'Thumbnail', width: 400, height: 400 },
  { label: 'Half size', width: 0.5, height: 0.5 },
] as const;

const FITS: { value: Fit; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'inside', label: 'Fit' },
  { value: 'fill', label: 'Stretch' },
];

const FIT_HINT: Record<Fit, string> = {
  cover: 'Fills the frame exactly, trimming edges if the shape differs.',
  contain: 'Shows the whole image inside the frame, with transparent padding.',
  inside: 'Shrinks to fit within the size, keeping its shape. No padding.',
  fill: 'Stretches to the exact size, ignoring the original shape.',
};

type ResizeResult = { blob: Blob; width: number; height: number };

export function ResizeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // null = not edited yet, so the inputs show the original size.
  const [widthInput, setWidth] = useState<string | null>(null);
  const [heightInput, setHeight] = useState<string | null>(null);
  const [locked, setLocked] = useState(true);
  const [fit, setFit] = useState<Fit>('cover');
  const job = useJob<ResizeResult>();

  const previewUrl = useObjectUrl(file);
  const natural = useImageSize(previewUrl);
  const result = job.state.status === 'done' ? job.state.result : null;
  const resultUrl = useObjectUrl(result?.blob);

  const width = widthInput ?? (natural ? String(natural.width) : '');
  const height = heightInput ?? (natural ? String(natural.height) : '');

  const ratio = natural ? natural.width / natural.height : null;
  const w = Number.parseInt(width, 10);
  const h = Number.parseInt(height, 10);
  const valid = w > 0 && h > 0 && w <= MAX_OUTPUT_DIMENSION && h <= MAX_OUTPUT_DIMENSION;
  const upscaling = !!natural && valid && (w > natural.width || h > natural.height);

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'server');
    setNotice(problem);
    if (!accepted[0]) return;
    job.reset();
    setFile(accepted[0]);
    setWidth(null);
    setHeight(null);
  };

  const clear = () => {
    job.reset();
    setFile(null);
    setNotice(null);
    setWidth(null);
    setHeight(null);
  };

  const onWidth = (value: string) => {
    setWidth(value);
    job.reset();
    const next = Number.parseInt(value, 10);
    if (locked && ratio && next > 0) setHeight(String(Math.max(1, Math.round(next / ratio))));
  };

  const onHeight = (value: string) => {
    setHeight(value);
    job.reset();
    const next = Number.parseInt(value, 10);
    if (locked && ratio && next > 0) setWidth(String(Math.max(1, Math.round(next * ratio))));
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    job.reset();
    if (preset.width < 1 && natural) {
      setWidth(String(Math.round(natural.width * preset.width)));
      setHeight(String(Math.round(natural.height * preset.height)));
      return;
    }
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    // A fixed preset defines its own shape.
    setLocked(false);
  };

  const run = () => {
    if (!file || !valid) return;
    posthog.capture('image_resize_started', { fit, width: w, height: h });
    void job.run(async () => {
      const blob = await postImageForm(
        '/api/image/compress',
        () => {
          const form = new FormData();
          form.append('file', file);
          form.append('level', 'lossless');
          form.append('width', String(w));
          form.append('height', String(h));
          form.append('fit', fit);
          return form;
        },
        'Resize failed',
      );
      const size = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          resolve({ width: w, height: h });
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
      posthog.capture('image_resize_completed', { fit, width: w, height: h, size: blob.size });
      return { blob, ...size };
    });
  };

  const disabledReason = !file
    ? 'Add an image first.'
    : !valid
      ? `Enter a width and height from 1 to ${MAX_OUTPUT_DIMENSION}px.`
      : null;

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      dimensions={natural}
      accept={ACCEPTED_IMAGE_TYPES}
      hint={SERVER_IMAGE_HINT}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {previewUrl && (
        <div className={cn('grid gap-4', resultUrl && 'sm:grid-cols-2')}>
          <ImagePreview
            src={previewUrl}
            alt="Original"
            label="Original"
            caption={
              natural ? `${natural.width}×${natural.height} · ${formatBytes(file!.size)}` : null
            }
          />
          {resultUrl && result && (
            <ImagePreview
              src={resultUrl}
              alt="Resized"
              label="Resized"
              caption={`${result.width}×${result.height} · ${formatBytes(result.blob.size)}`}
            />
          )}
        </div>
      )}
    </SingleImageWorkspace>
  );

  const settings = (
    <Panel title="Size">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={!file}
              onClick={() => applyPreset(preset)}
              className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-colors hover:border-primary-line hover:bg-primary-soft disabled:opacity-40"
            >
              <span className="block text-xs font-medium">{preset.label}</span>
              <span className="block font-mono text-[10px] text-muted-foreground">
                {preset.width < 1 ? '50%' : `${preset.width}×${preset.height}`}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <label className="flex-1 space-y-1.5">
            <span className="text-[13px] font-medium">Width</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_OUTPUT_DIMENSION}
              value={width}
              disabled={!file}
              className="font-mono"
              onChange={(event) => onWidth(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!file}
            aria-pressed={locked}
            aria-label={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
            title={locked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            onClick={() => setLocked((value) => !value)}
            className={cn(
              'mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-40',
              locked
                ? 'border-primary-line bg-primary-soft text-primary'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {locked ? <Link2 className="size-4" /> : <Unlink2 className="size-4" />}
          </button>
          <label className="flex-1 space-y-1.5">
            <span className="text-[13px] font-medium">Height</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_OUTPUT_DIMENSION}
              value={height}
              disabled={!file}
              className="font-mono"
              onChange={(event) => onHeight(event.target.value)}
            />
          </label>
        </div>

        {upscaling && (
          <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-xs leading-5">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
            Larger than the original — enlarged images look softer.
          </p>
        )}

        <Field label="Fit" hint={FIT_HINT[fit]}>
          <Segmented
            label="Fit"
            value={fit}
            disabled={!file}
            onChange={(next) => {
              setFit(next);
              job.reset();
            }}
            options={FITS}
          />
        </Field>
      </div>
    </Panel>
  );

  // Settings stay visible with the result: changing any of them clears it.
  const sidebar = (
    <>
      {settings}
      {result ? (
        <ResultPanel
          title={`Resized to ${result.width}×${result.height}`}
          onDownload={() =>
            downloadBlob(
              result.blob,
              `${stem(file!.name)}-${result.width}x${result.height}.${extensionFor(result.blob.type)}`,
            )
          }
          onStartOver={clear}
          startOverLabel="Use a different image"
        >
          <p className="text-sm text-muted-foreground">
            {formatBytes(result.blob.size)} · {extensionFor(result.blob.type).toUpperCase()}
          </p>
        </ResultPanel>
      ) : (
        <ActionPanel
          label={valid ? `Resize to ${w}×${h}` : 'Resize image'}
          disabledReason={disabledReason}
          job={job.state}
          onRun={run}
          animation="squish"
        />
      )}
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
