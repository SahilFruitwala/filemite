import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

import { AddFilesButton } from '@/components/tool/file-drop';
import {
  ActionPanel,
  Checkbox,
  Field,
  Message,
  Panel,
  Segmented,
  Slider,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Input } from '@/components/ui/input';
import { CanvasFrame } from '@/features/image/components/canvas-frame';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import {
  PREVIEW_MAX_SIDE,
  canvasToBlob,
  createCanvas,
  fitWithin,
  outputMime,
  paintBackground,
} from '@/features/image/lib/canvas';
import { WATERMARK_POSITIONS, type WatermarkPosition } from '@/features/image/lib/edit-geometry';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  extensionFor,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import { useDecodedImage } from '@/features/image/lib/use-decoded-image';
import {
  DEFAULT_SETTINGS,
  drawWatermark,
  type WatermarkMark,
  type WatermarkSettings,
} from '@/features/image/lib/watermark';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-watermark');

type Kind = 'text' | 'logo';

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  'middle-left': 'Middle left',
  center: 'Center',
  'middle-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
};

const ROTATIONS = [
  { value: '0', label: '0°' },
  { value: '-30', label: '−30°' },
  { value: '-45', label: '−45°' },
] as const;

export function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('© Your name');
  const [color, setColor] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);
  const job = useJob<void>('image_watermark');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const previewUrl = useObjectUrl(file);
  const { image, error, loading } = useDecodedImage(previewUrl);
  const logoUrl = useObjectUrl(logoFile);
  const logo = useDecodedImage(logoUrl);

  const logoImage = logo.image;
  const mark = useMemo<WatermarkMark | null>(() => {
    if (kind === 'text') return text.trim() ? { kind: 'text', text: text.trim(), color } : null;
    return logoImage ? { kind: 'logo', image: logoImage } : null;
  }, [kind, text, color, logoImage]);

  // Redraw the preview whenever the image, the mark or its settings change.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !image) return;
    const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, PREVIEW_MAX_SIDE);
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    if (mark) drawWatermark(context, mark, settings);
  }, [image, mark, settings]);

  const edit = (update: () => void) => {
    job.reset();
    update();
  };
  const change = (patch: Partial<WatermarkSettings>) =>
    edit(() => setSettings((current) => ({ ...current, ...patch })));

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (accepted[0]) edit(() => setFile(accepted[0]));
  };

  const addLogo = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setLogoNotice(problem);
    if (accepted[0]) edit(() => setLogoFile(accepted[0]));
  };

  const clear = () =>
    edit(() => {
      setFile(null);
      setNotice(null);
    });

  const save = () => {
    if (!file || !image || !mark) return;
    void job.run(async () => {
      const mime = outputMime(file.type);
      const { canvas, context } = createCanvas(image.naturalWidth, image.naturalHeight);
      paintBackground(context, mime);
      context.drawImage(image, 0, 0);
      drawWatermark(context, mark, settings);
      const blob = await canvasToBlob(canvas, mime);
      downloadBlob(blob, `${stem(file.name)}-watermarked.${extensionFor(mime)}`);
    });
  };

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      dimensions={image ? { width: image.naturalWidth, height: image.naturalHeight } : null}
      accept={BROWSER_IMAGE_TYPES}
      hint={BROWSER_IMAGE_HINT}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {error && <Message tone="error">{error}</Message>}
      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Opening image…</p>}
      {image && <CanvasFrame ref={canvasRef} label="Preview of the watermarked image" />}
    </SingleImageWorkspace>
  );

  const disabledReason = !image
    ? 'Add an image first.'
    : !mark
      ? kind === 'text'
        ? 'Type the watermark text.'
        : 'Choose a logo first.'
      : null;

  const sidebar = (
    <>
      <Panel title="Watermark">
        <div className="space-y-4">
          <Segmented
            label="Watermark type"
            value={kind}
            onChange={(next) => edit(() => setKind(next))}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'logo', label: 'Logo' },
            ]}
          />

          {kind === 'text' ? (
            <div className="flex items-end gap-2">
              <label className="block min-w-0 flex-1 space-y-1.5">
                <span className="text-[13px] font-medium">Text</span>
                <Input
                  value={text}
                  maxLength={80}
                  placeholder="© Your name"
                  onChange={(event) => edit(() => setText(event.target.value))}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium">Color</span>
                <input
                  type="color"
                  value={color}
                  aria-label="Text color"
                  onChange={(event) => edit(() => setColor(event.target.value))}
                  className="block h-10 w-12 cursor-pointer rounded-lg border border-input bg-card p-1"
                />
              </label>
            </div>
          ) : (
            <Field
              label="Logo"
              hint={
                logo.error ?? logoNotice ?? 'PNG with a transparent background works best.'
              }
            >
              <div className="flex items-center gap-3">
                <div className="bg-checker flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border">
                  {logoUrl && logo.image ? (
                    <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <AddFilesButton
                  accept={BROWSER_IMAGE_TYPES}
                  multiple={false}
                  onFiles={addLogo}
                  label={logoFile ? 'Replace logo' : 'Choose logo'}
                />
              </div>
            </Field>
          )}

          <Slider
            label="Size"
            value={settings.sizePercent}
            min={5}
            max={80}
            format={(value) => `${value}% of width`}
            onChange={(sizePercent) => change({ sizePercent })}
          />
          <Slider
            label="Opacity"
            value={Math.round(settings.opacity * 100)}
            min={10}
            max={100}
            step={5}
            format={(value) => `${value}%`}
            onChange={(value) => change({ opacity: value / 100 })}
          />
        </div>
      </Panel>

      <Panel title="Placement">
        <div className="space-y-4">
          <Checkbox
            checked={settings.tile}
            // A tiled mark reads better smaller and tilted; switching back restores the single-mark defaults.
            onChange={(tile) =>
              change({
                tile,
                rotation: tile ? -30 : DEFAULT_SETTINGS.rotation,
                sizePercent: tile ? 20 : DEFAULT_SETTINGS.sizePercent,
              })
            }
            label="Repeat across the image"
            description="Covers the whole picture, which makes the mark harder to crop out."
          />
          {!settings.tile && (
            <Field label="Position">
              <div role="radiogroup" aria-label="Position" className="grid w-36 grid-cols-3 gap-1">
                {WATERMARK_POSITIONS.map((position) => {
                  const active = settings.position === position;
                  return (
                    <button
                      key={position}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={POSITION_LABELS[position]}
                      title={POSITION_LABELS[position]}
                      onClick={() => change({ position })}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-md border transition-colors',
                        active
                          ? 'border-primary bg-primary-soft'
                          : 'border-border bg-card hover:border-border-strong',
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          active ? 'bg-primary' : 'bg-border-strong',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <Field label="Angle" className="pt-1.5">
            <Segmented
              label="Angle"
              value={String(settings.rotation) as (typeof ROTATIONS)[number]['value']}
              onChange={(value) => change({ rotation: Number(value) })}
              options={[...ROTATIONS]}
            />
          </Field>
        </div>
      </Panel>

      <ActionPanel
        label="Download image"
        disabledReason={disabledReason}
        job={job.state}
        onRun={save}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        Saved at full resolution in the original format (GIF and AVIF become PNG). Camera metadata
        such as location isn’t kept.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
