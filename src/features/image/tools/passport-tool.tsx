import { useEffect, useRef, useState } from 'react';
import { Move, RotateCcw } from 'lucide-react';

import { ColorSwatches } from '@/components/tool/color-swatches';
import {
  ActionPanel,
  Field,
  Message,
  Panel,
  Segmented,
  Slider,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import { canvasToBlob, createCanvas } from '@/features/image/lib/canvas';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import {
  DPI,
  MAX_MM,
  MIN_MM,
  PHOTO_SIZES,
  SHEETS,
  mmToPx,
  photoPlacement,
  sheetLayout,
} from '@/features/image/lib/passport';
import { useDecodedImage } from '@/features/image/lib/use-decoded-image';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { plural } from '@/lib/format';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-passport');

/** On-screen height of the framing preview, in CSS pixels. */
const PREVIEW_HEIGHT = 420;

type Framing = { zoom: number; x: number; y: number };
const START: Framing = { zoom: 1, x: 0, y: 0 };

const SHEET_PREVIEW_WIDTH = 340;

export function PassportTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState('eu');
  const [customW, setCustomW] = useState('35');
  const [customH, setCustomH] = useState('45');
  const [sheetId, setSheetId] = useState('single');
  const [background, setBackground] = useState('#ffffff');
  const [framing, setFraming] = useState<Framing>(START);
  const [guides, setGuides] = useState(true);
  const job = useJob<void>('passport_photo');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; framing: Framing } | null>(null);

  const previewUrl = useObjectUrl(file);
  const { image, error, loading } = useDecodedImage(previewUrl);

  const preset = PHOTO_SIZES.find((item) => item.id === sizeId)!;
  const widthMm = sizeId === 'custom' ? Number(customW) : preset.widthMm;
  const heightMm = sizeId === 'custom' ? Number(customH) : preset.heightMm;
  const sizeError =
    sizeId === 'custom' &&
    !(widthMm >= MIN_MM && widthMm <= MAX_MM && heightMm >= MIN_MM && heightMm <= MAX_MM)
      ? `Enter sizes between ${MIN_MM} and ${MAX_MM} mm.`
      : null;
  const validSize = !sizeError && widthMm > 0 && heightMm > 0;
  const aspect = validSize ? widthMm / heightMm : 35 / 45;

  const sheet = SHEETS.find((item) => item.id === sheetId)!;
  const layout =
    validSize && sheet.id !== 'single' ? sheetLayout(sheet, { widthMm, heightMm }) : null;

  const previewWidth = Math.round(PREVIEW_HEIGHT * aspect);

  /** Draws one photo at `width` × `height` pixels. */
  const paintPhoto = (context: CanvasRenderingContext2D, width: number, height: number, ox = 0, oy = 0) => {
    if (!image) return;
    context.fillStyle = background;
    context.fillRect(ox, oy, width, height);
    const place = photoPlacement(image.naturalWidth, image.naturalHeight, width, height, framing.zoom, framing.x, framing.y);
    context.save();
    context.beginPath();
    context.rect(ox, oy, width, height);
    context.clip();
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, ox + place.x, oy + place.y, place.width, place.height);
    context.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !image) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(previewWidth * ratio);
    canvas.height = Math.round(PREVIEW_HEIGHT * ratio);
    context.clearRect(0, 0, canvas.width, canvas.height);
    paintPhoto(context, canvas.width, canvas.height);
    // paintPhoto reads these values; the dependency list names them directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, framing, background, previewWidth]);

  // Miniature of the print sheet, built from the framed preview above so it updates live.
  const sheetPreview = layout && layout.positions.length > 0 ? layout : null;
  const sheetScale = sheetPreview ? SHEET_PREVIEW_WIDTH / Math.max(sheetPreview.width, sheetPreview.height) : 0;
  useEffect(() => {
    const source = canvasRef.current;
    const canvas = sheetRef.current;
    const context = canvas?.getContext('2d');
    if (!source || !canvas || !context || !sheetPreview || !image) return;
    const ratio = window.devicePixelRatio || 1;
    const scale = sheetScale * ratio;
    canvas.width = Math.round(sheetPreview.width * scale);
    canvas.height = Math.round(sheetPreview.height * scale);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.strokeStyle = 'rgb(0 0 0 / 0.25)';
    context.lineWidth = 1;
    for (const { x, y } of sheetPreview.positions) {
      const w = sheetPreview.photoWidth * scale;
      const h = sheetPreview.photoHeight * scale;
      context.drawImage(source, x * scale, y * scale, w, h);
      context.strokeRect(x * scale - 0.5, y * scale - 0.5, w + 1, h + 1);
    }
    // sheetPreview is rebuilt every render; these are the values it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, framing, background, previewWidth, sheetId, widthMm, heightMm, sheetScale]);

  const change = (update: () => void) => {
    job.reset();
    update();
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (!accepted[0]) return;
    change(() => {
      setFraming(START);
      setFile(accepted[0]);
    });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, framing };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const rect = event.currentTarget.getBoundingClientRect();
    job.reset();
    setFraming({
      ...start.framing,
      x: start.framing.x + (event.clientX - start.x) / rect.width,
      y: start.framing.y + (event.clientY - start.y) / rect.height,
    });
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    change(() => setFraming((current) => ({ ...current, x: current.x + move[0], y: current.y + move[1] })));
  };

  const save = () => {
    if (!file || !image || !validSize) return;
    void job.run(async () => {
      const photoW = mmToPx(widthMm);
      const photoH = mmToPx(heightMm);
      const name = stem(file.name);
      if (!layout) {
        const { canvas, context } = createCanvas(photoW, photoH);
        paintPhoto(context, photoW, photoH);
        downloadBlob(await canvasToBlob(canvas, 'image/jpeg', 0.95), `${name}-${widthMm}x${heightMm}mm.jpg`);
        return;
      }
      if (!layout.positions.length) throw new Error('That photo is too big for this sheet. Pick a bigger sheet.');
      const { canvas, context } = createCanvas(layout.width, layout.height);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, layout.width, layout.height);
      // Draw the photo once, then repeat it, so every copy is identical.
      const single = createCanvas(photoW, photoH);
      paintPhoto(single.context, photoW, photoH);
      for (const { x, y } of layout.positions) context.drawImage(single.canvas, x, y);
      // Hairline cut marks around each photo.
      context.strokeStyle = 'rgb(0 0 0 / 0.25)';
      context.lineWidth = 1;
      for (const { x, y } of layout.positions) context.strokeRect(x - 0.5, y - 0.5, photoW + 1, photoH + 1);
      downloadBlob(await canvasToBlob(canvas, 'image/jpeg', 0.95), `${name}-${sheet.id}-sheet.jpg`);
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
      onClear={() =>
        change(() => {
          setFile(null);
          setNotice(null);
          setFraming(START);
        })
      }
    >
      {error && <Message tone="error">{error}</Message>}
      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Opening image…</p>}
      {image && (
        <div className="space-y-3">
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Move className="size-3.5" />
            Drag the photo to centre the face. Use the slider to zoom.
          </p>
          <div className="bg-checker flex justify-center rounded-xl border border-border p-4">
            <div
              role="group"
              tabIndex={0}
              aria-label="Photo frame. Drag, or use the arrow keys, to move the photo."
              className="relative max-w-full cursor-grab touch-none overflow-hidden rounded-sm shadow-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
              style={{ width: previewWidth, height: PREVIEW_HEIGHT }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              onKeyDown={onKeyDown}
            >
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Preview of the cropped photo"
                className="pointer-events-none size-full"
              />
              {guides && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
                  <ellipse cx="50" cy="44" rx="23" ry="30" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 1px rgb(0 0 0 / .7))' }} />
                  <line x1="0" y1="14" x2="100" y2="14" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 1px rgb(0 0 0 / .7))' }} />
                  <line x1="0" y1="74" x2="100" y2="74" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 1px rgb(0 0 0 / .7))' }} />
                </svg>
              )}
            </div>
          </div>
          <p className="text-center font-mono text-[11px] text-muted-foreground tabular">
            {validSize ? `${mmToPx(widthMm)}×${mmToPx(heightMm)} px at ${DPI} dpi` : 'Choose a valid size'}
            {layout && layout.positions.length > 0 && ` · ${plural(layout.positions.length, 'photo')} per sheet`}
          </p>
          {sheetPreview && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-2 pt-2 duration-300">
              <p className="eyebrow text-center">Print sheet preview · {sheet.label}</p>
              <div className="flex justify-center rounded-xl border border-border bg-muted/60 p-5">
                <canvas
                  ref={sheetRef}
                  role="img"
                  aria-label={`Print sheet with ${plural(sheetPreview.positions.length, 'photo')}`}
                  className="sticker max-w-full rounded-[3px] bg-white"
                  style={{
                    width: Math.round(sheetPreview.width * sheetScale),
                    height: Math.round(sheetPreview.height * sheetScale),
                  }}
                />
              </div>
            </div>
          )}
          {layout && layout.positions.length === 0 && (
            <Message tone="error">That photo is too big for this sheet. Pick a bigger sheet.</Message>
          )}
        </div>
      )}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel title="Photo size">
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium">Country or document</span>
            <select
              value={sizeId}
              onChange={(event) => change(() => setSizeId(event.target.value))}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              {PHOTO_SIZES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {sizeId === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium">Width (mm)</span>
                <Input inputMode="decimal" value={customW} aria-invalid={!!sizeError} onChange={(event) => change(() => setCustomW(event.target.value))} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium">Height (mm)</span>
                <Input inputMode="decimal" value={customH} aria-invalid={!!sizeError} onChange={(event) => change(() => setCustomH(event.target.value))} />
              </label>
              {sizeError && <p className="col-span-2 text-xs font-medium text-danger">{sizeError}</p>}
            </div>
          )}
          <Field label="Background colour" hint="Fills any space the photo doesn’t cover.">
            <ColorSwatches
              label="Background colour"
              value={background}
              colors={['#ffffff', '#f2f2f2', '#d6e6f5', '#c8d8f0', '#e9e9e9']}
              onChange={(color) => change(() => setBackground(color))}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Framing"
        action={
          <Button variant="ghost" size="xs" disabled={framing === START} onClick={() => change(() => setFraming(START))}>
            <RotateCcw />
            Reset
          </Button>
        }
      >
        <div className="space-y-4">
          <Slider
            label="Zoom"
            value={Math.round(framing.zoom * 100)}
            min={50}
            max={400}
            format={(value) => `${value}%`}
            onChange={(value) => change(() => setFraming((current) => ({ ...current, zoom: value / 100 })))}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={guides}
              onChange={(event) => setGuides(event.target.checked)}
              className="size-[18px] accent-primary"
            />
            Show head guide
          </label>
          <p className="text-xs leading-5 text-muted-foreground">
            The guide is a rough help — keep the head inside the oval, eyes near the middle. Check
            your country’s current rules; they vary and change.
          </p>
        </div>
      </Panel>

      <ActionPanel
        label={layout ? 'Download print sheet' : 'Download photo'}
        disabledReason={!image ? 'Add a photo first.' : !validSize ? 'Enter a valid size.' : null}
        job={job.state}
        onRun={save}
      >
        <Segmented<string>
          label="Output"
          value={sheetId}
          onChange={(next) => change(() => setSheetId(next))}
          options={SHEETS.map(({ id, label }) => ({
            value: id,
            label: id === 'single' ? 'Single' : label.replace(' sheet', ''),
            title: label,
          }))}
        />
      </ActionPanel>
      <p className={cn('px-1 text-xs leading-5 text-muted-foreground')}>
        Saved as a high-quality JPEG at 300 dpi. Print sheets repeat the photo with thin cut lines,
        ready for a photo lab or home printer at 100% scale.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
