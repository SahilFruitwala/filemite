import { useEffect, useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';

import { AddFilesButton, DropTarget, FileDrop } from '@/components/tool/file-drop';
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
import { CanvasFrame } from '@/features/image/components/canvas-frame';
import { ImageSortGrid, type SortableImage } from '@/features/image/components/image-sort-grid';
import { PREVIEW_MAX_SIDE, canvasToBlob, createCanvas, fitWithin } from '@/features/image/lib/canvas';
import {
  COLLAGE_ASPECTS,
  coverSource,
  collageCells,
  defaultColumns,
  type CollageLayout,
} from '@/features/image/lib/collage';
import { BROWSER_IMAGE_HINT, BROWSER_IMAGE_TYPES, partitionImages } from '@/features/image/lib/files';
import { exportScale } from '@/features/image/lib/beautify';
import { useDecodedImages } from '@/features/image/lib/use-decoded-images';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { plural } from '@/lib/format';
import { getTool } from '@/lib/tools';

const tool = getTool('image-collage');

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 12;
/** The collage's longer side when saved. */
const OUTPUT_SIDE = 2400;

type Format = 'jpeg' | 'png';
type Fit = 'fill' | 'fit';

const LAYOUTS: { value: CollageLayout; label: string; title: string }[] = [
  { value: 'grid', label: 'Grid', title: 'Rows and columns' },
  { value: 'feature', label: 'Feature', title: 'One big photo, the rest beside it' },
  { value: 'row', label: 'Row', title: 'Side by side' },
  { value: 'column', label: 'Column', title: 'Stacked' },
];

export function CollageTool() {
  const [photos, setPhotos] = useState<SortableImage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [layout, setLayout] = useState<CollageLayout>('grid');
  const [aspectId, setAspectId] = useState('1:1');
  const [columns, setColumns] = useState<number | null>(null);
  const [spacing, setSpacing] = useState(2);
  const [radius, setRadius] = useState(0);
  const [background, setBackground] = useState('#ffffff');
  const [fit, setFit] = useState<Fit>('fill');
  const [format, setFormat] = useState<Format>('jpeg');
  const job = useJob<void>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { images, errors, ready } = useDecodedImages(photos);
  const aspect = COLLAGE_ASPECTS.find((item) => item.id === aspectId)?.ratio ?? 1;
  const autoColumns = defaultColumns(photos.length || 1, aspect);
  const usedColumns = Math.min(columns ?? autoColumns, Math.max(1, photos.length));

  /** Paints the collage onto a canvas of the given pixel size. */
  const paint = (context: CanvasRenderingContext2D, width: number, height: number) => {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    const gap = Math.round((spacing / 100) * Math.max(width, height));
    const cells = collageCells(layout, photos.length, width, height, gap, usedColumns);
    const corner = Math.round((radius / 100) * Math.min(width, height));
    cells.forEach((cell, index) => {
      const image = images.get(photos[index].id);
      if (!image) return;
      const source = coverSource(image.naturalWidth, image.naturalHeight, cell, fit);
      context.save();
      context.beginPath();
      context.roundRect(source.dx, source.dy, source.dWidth, source.dHeight, Math.min(corner, source.dWidth / 2, source.dHeight / 2));
      context.clip();
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, source.sx, source.sy, source.sWidth, source.sHeight, source.dx, source.dy, source.dWidth, source.dHeight);
      context.restore();
    });
  };

  const outputSize = (side: number) =>
    aspect >= 1
      ? { width: side, height: Math.round(side / aspect) }
      : { width: Math.round(side * aspect), height: side };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || photos.length === 0) return;
    const { width, height } = outputSize(PREVIEW_MAX_SIDE);
    const shown = fitWithin(width, height, 900);
    canvas.width = shown.width;
    canvas.height = shown.height;
    paint(context, shown.width, shown.height);
    // paint() reads these; the list names every input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, images, layout, aspect, usedColumns, spacing, radius, background, fit]);

  const edit = (next: SortableImage[]) => {
    job.reset();
    setPhotos(next);
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files, 'browser');
    const problems = problem ? [problem] : [];
    const room = Math.max(0, MAX_PHOTOS - photos.length);
    if (accepted.length > room) problems.push(`Up to ${MAX_PHOTOS} photos — ${plural(accepted.length - room, 'photo')} skipped.`);
    setNotice(problems.length ? problems.join(' ') : null);
    if (!accepted.length || !room) return;
    edit([...photos, ...accepted.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file }))]);
  };

  const change = (update: () => void) => {
    job.reset();
    update();
  };

  const save = () => {
    void job.run(async () => {
      const full = outputSize(OUTPUT_SIDE);
      const scale = exportScale(full.width, full.height);
      const width = Math.round(full.width * scale);
      const height = Math.round(full.height * scale);
      const { canvas, context } = createCanvas(width, height);
      paint(context, width, height);
      const blob = await canvasToBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', 0.92);
      downloadBlob(blob, `collage.${format === 'png' ? 'png' : 'jpg'}`);
    });
  };

  const main =
    photos.length === 0 ? (
      <div className="space-y-3">
        <FileDrop
          accept={BROWSER_IMAGE_TYPES}
          multiple
          onFiles={add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose photos"
          hint={`${BROWSER_IMAGE_HINT} · ${MIN_PHOTOS}–${MAX_PHOTOS} photos`}
          icon={ImageUp}
        />
        {notice && <Message tone="error">{notice}</Message>}
      </div>
    ) : (
      <DropTarget onFiles={add} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium">
            {plural(photos.length, 'photo')}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {photos.length}/{MAX_PHOTOS}
            </span>
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              edit([]);
              setNotice(null);
            }}
          >
            <Trash2 />
            Clear
          </Button>
          {photos.length < MAX_PHOTOS && (
            <AddFilesButton accept={BROWSER_IMAGE_TYPES} multiple onFiles={add} label="Add photos" />
          )}
        </div>
        {notice && <Message tone="error">{notice}</Message>}
        {errors.map((message) => (
          <Message key={message} tone="error">
            {message}
          </Message>
        ))}
        {photos.length >= MIN_PHOTOS ? (
          <CanvasFrame ref={canvasRef} label="Preview of the collage" maxHeight={520} />
        ) : (
          <Message tone="info">Add at least one more photo to make a collage.</Message>
        )}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="[@media(hover:none)]:hidden">Drag cards</span>
            <span className="hidden [@media(hover:none)]:inline">Press and hold a card, then drag it</span> to change
            which photo goes where.
          </p>
          <ImageSortGrid
            items={photos}
            onReorder={edit}
            onRemove={(id) => edit(photos.filter((photo) => photo.id !== id))}
            noun="Photo"
          />
        </div>
      </DropTarget>
    );

  const sidebar = (
    <>
      <Panel title="Layout">
        <div className="space-y-4">
          <Segmented<CollageLayout>
            label="Layout"
            value={layout}
            onChange={(next) => change(() => setLayout(next))}
            options={LAYOUTS}
          />
          <Field label="Shape">
            <Segmented<string>
              label="Collage shape"
              value={aspectId}
              onChange={(next) => change(() => setAspectId(next))}
              options={COLLAGE_ASPECTS.map(({ id, label }) => ({ value: id, label }))}
            />
          </Field>
          {layout === 'grid' && photos.length > 2 && (
            <Slider
              label="Columns"
              value={usedColumns}
              min={1}
              max={Math.min(6, photos.length)}
              onChange={(next) => change(() => setColumns(next))}
            />
          )}
          <Field label="Photos fill their space" hint={fit === 'fill' ? 'Crops from the middle so there are no gaps.' : 'Shows each whole photo; background shows around it.'}>
            <Segmented<Fit>
              label="How photos fit"
              value={fit}
              onChange={(next) => change(() => setFit(next))}
              options={[
                { value: 'fill', label: 'Crop to fill' },
                { value: 'fit', label: 'Show whole photo' },
              ]}
            />
          </Field>
        </div>
      </Panel>
      <Panel title="Style">
        <div className="space-y-4">
          <Slider label="Spacing" value={spacing} min={0} max={8} step={0.5} format={(v) => `${v}%`} onChange={(next) => change(() => setSpacing(next))} />
          <Slider label="Rounded corners" value={radius} min={0} max={20} format={(v) => `${v}%`} onChange={(next) => change(() => setRadius(next))} />
          <Field label="Background">
            <ColorSwatches
              label="Background colour"
              value={background}
              colors={['#ffffff', '#111111', '#f4efe6', '#dbeafe', '#fde68a', '#fecdd3']}
              onChange={(color) => change(() => setBackground(color))}
            />
          </Field>
        </div>
      </Panel>
      <ActionPanel
        label="Download collage"
        disabledReason={
          photos.length < MIN_PHOTOS ? `Add ${MIN_PHOTOS - photos.length === 1 ? 'one more photo' : 'two or more photos'}.` : !ready ? 'Opening photos…' : errors.length ? 'Remove the photos that couldn’t be opened.' : null
        }
        job={job.state}
        onRun={save}
      >
        <Segmented<Format>
          label="File format"
          value={format}
          onChange={setFormat}
          options={[
            { value: 'jpeg', label: 'JPG', title: 'Smaller file' },
            { value: 'png', label: 'PNG', title: 'Lossless' },
          ]}
        />
      </ActionPanel>
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        Saved at up to {OUTPUT_SIDE}px on the longer side. Camera metadata such as location isn’t kept.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={photos.length > 0} />;
}
