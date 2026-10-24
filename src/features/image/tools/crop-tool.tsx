import posthog from 'posthog-js';
import { useEffect, useState } from 'react';
import smartcrop from 'smartcrop';
import { Download, Loader2 } from 'lucide-react';

import { Checkbox, Message, Panel, ToolLayout } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  extensionFor,
  loadImage,
  partitionImages,
  stem,
  useImageSize,
  useObjectUrl,
} from '@/features/image/lib/files';
import { downloadBlob, downloadBlobsAsZip } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-crop');

type Target = { id: string; label: string; ratio: string; width: number; height: number };

const TARGETS: Target[] = [
  { id: 'square', label: 'Square post', ratio: '1:1', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait post', ratio: '4:5', width: 1080, height: 1350 },
  { id: 'story', label: 'Story / Reel', ratio: '9:16', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Link preview', ratio: '1.91:1', width: 1200, height: 630 },
  { id: 'wide', label: 'Widescreen', ratio: '16:9', width: 1920, height: 1080 },
];

/** Analysis runs on a downscaled copy — far faster and just as accurate. */
const ANALYSIS_SIZE = 640;

type Crop = { target: Target; blob: Blob; url: string };

async function smartCrops(url: string, mime: string, targets: Target[]): Promise<Crop[]> {
  const img = await loadImage(url);
  const scale = Math.min(1, ANALYSIS_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
  const sample = document.createElement('canvas');
  sample.width = Math.round(img.naturalWidth * scale);
  sample.height = Math.round(img.naturalHeight * scale);
  sample.getContext('2d')!.drawImage(img, 0, 0, sample.width, sample.height);

  const type = /png|webp/.test(mime) ? mime : 'image/jpeg';
  const crops: Crop[] = [];
  for (const target of targets) {
    const { topCrop } = await smartcrop.crop(sample, {
      width: target.width,
      height: target.height,
    });
    // Never upscale beyond what the source can provide for this crop.
    const sx = topCrop.x / scale;
    const sy = topCrop.y / scale;
    const sw = topCrop.width / scale;
    const sh = topCrop.height / scale;
    const factor = Math.min(1, sw / target.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(target.width * factor);
    canvas.height = Math.round(target.height * factor);
    const context = canvas.getContext('2d')!;
    context.imageSmoothingQuality = 'high';
    context.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (blob) crops.push({ target, blob, url: URL.createObjectURL(blob) });
  }
  return crops;
}

export function CropTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(['square', 'story', 'landscape']),
  );
  // Results are tagged with the input they came from, so stale ones read as "working".
  const [output, setOutput] = useState<{ key: string; crops: Crop[]; error: string | null } | null>(
    null,
  );

  const previewUrl = useObjectUrl(file);
  const natural = useImageSize(previewUrl);

  const targetIds = TARGETS.filter((target) => selected.has(target.id))
    .map((target) => target.id)
    .join(',');
  const key = previewUrl ? `${previewUrl}|${targetIds}` : '';
  const crops = output?.crops ?? [];
  const error = output?.key === key ? output.error : null;
  const status = previewUrl && output?.key !== key ? 'working' : 'idle';

  // Recrop whenever the image or the chosen formats change.
  useEffect(() => {
    if (!previewUrl || !file) return;
    let cancelled = false;
    const ids = targetIds.split(',');
    const wanted = TARGETS.filter((target) => ids.includes(target.id));
    smartCrops(previewUrl, file.type, wanted).then(
      (next) => {
        if (cancelled) return next.forEach((crop) => URL.revokeObjectURL(crop.url));
        setOutput({ key, crops: next, error: null });
        posthog.capture('image_crop_completed', { target_count: next.length });
      },
      (reason: unknown) => {
        if (cancelled) return;
        posthog.capture('image_crop_failed');
        setOutput({
          key,
          crops: [],
          error: reason instanceof Error ? reason.message : 'Cropping failed.',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [previewUrl, file, key, targetIds]);

  // Free the previous set of crops when it's replaced.
  useEffect(() => () => output?.crops.forEach((crop) => URL.revokeObjectURL(crop.url)), [output]);

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (accepted[0]) setFile(accepted[0]);
  };

  const clear = () => {
    setFile(null);
    setOutput(null);
    setNotice(null);
  };

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const fileName = (crop: Crop) =>
    `${stem(file?.name ?? 'image')}-${crop.target.id}.${extensionFor(crop.blob.type)}`;

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      dimensions={natural}
      accept={BROWSER_IMAGE_TYPES}
      hint={BROWSER_IMAGE_HINT}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {error && <Message tone="error">{error}</Message>}
      {file && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {crops.map((crop) => (
            <figure key={crop.target.id} className="group space-y-2">
              <div
                className={cn(
                  'bg-checker relative overflow-hidden rounded-xl border border-border shadow-xs transition-opacity',
                  status === 'working' && 'opacity-50',
                )}
                style={{ aspectRatio: `${crop.target.width} / ${crop.target.height}` }}
              >
                <img src={crop.url} alt={crop.target.label} className="size-full object-cover" />
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Download ${crop.target.label}`}
                  className="absolute top-2 right-2 opacity-0 shadow-md group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100 [@media(hover:none)]:opacity-100"
                  onClick={() => downloadBlob(crop.blob, fileName(crop))}
                >
                  <Download />
                </Button>
              </div>
              <figcaption className="flex items-baseline justify-between gap-2 px-0.5">
                <span className="text-[13px] font-medium">{crop.target.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {crop.target.ratio}
                </span>
              </figcaption>
            </figure>
          ))}
          {status === 'working' && crops.length === 0 && (
            <p className="col-span-full flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Finding the subject…
            </p>
          )}
        </div>
      )}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel title="Formats">
        <div className="space-y-3">
          {TARGETS.map((target) => (
            <Checkbox
              key={target.id}
              checked={selected.has(target.id)}
              onChange={(on) => toggle(target.id, on)}
              label={`${target.label} · ${target.ratio}`}
              description={`${target.width}×${target.height}`}
            />
          ))}
        </div>
      </Panel>
      {file && crops.length > 0 && (
        <Panel>
          <Button
            size="xl"
            block
            disabled={status === 'working'}
            onClick={() => {
              posthog.capture('image_crop_download_clicked', { file_count: crops.length });
              void downloadBlobsAsZip(
                crops.map((crop) => ({ name: fileName(crop), blob: crop.blob })),
                `${stem(file.name)}-crops.zip`,
              );
            }}
          >
            <Download />
            Download {crops.length > 1 ? `all ${crops.length}` : ''}
          </Button>
          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            {formatBytes(crops.reduce((sum, crop) => sum + crop.blob.size, 0))} total
          </p>
        </Panel>
      )}
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        The subject is detected from skin tones, edges and saturation. Crops never upscale past the
        source resolution.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
