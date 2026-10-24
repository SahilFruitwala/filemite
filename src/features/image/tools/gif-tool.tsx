import { useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';

import { ColorSwatches } from '@/components/tool/color-swatches';
import { AddFilesButton, DropTarget, FileDrop } from '@/components/tool/file-drop';
import {
  ActionPanel,
  Checkbox,
  Field,
  Message,
  Panel,
  ResultPanel,
  Segmented,
  Slider,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { ImageSortGrid, type SortableImage } from '@/features/image/components/image-sort-grid';
import { MAX_CANVAS_PIXELS, createCanvas } from '@/features/image/lib/canvas';
import { BROWSER_IMAGE_HINT, BROWSER_IMAGE_TYPES, loadImage, partitionImages } from '@/features/image/lib/files';
import { MAX_GIF_FRAMES, encodeGif, gifSize, pingPong } from '@/features/image/lib/gif';
import { coverSource } from '@/features/image/lib/collage';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { formatBytes, plural } from '@/lib/format';
import { getTool } from '@/lib/tools';

const tool = getTool('image-gif');

const MIN_FRAMES = 2;

const SIZES = [
  { value: '240', label: '240' },
  { value: '480', label: '480' },
  { value: '720', label: '720' },
] as const;

type Fit = 'fill' | 'fit';
type Result = { blob: Blob; url: string; width: number; height: number; frames: number };

export function GifTool() {
  const [frames, setFrames] = useState<SortableImage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [maxSide, setMaxSide] = useState('480');
  const [delay, setDelay] = useState(500);
  const [loop, setLoop] = useState(true);
  const [bounce, setBounce] = useState(false);
  const [fit, setFit] = useState<Fit>('fill');
  const [background, setBackground] = useState('#ffffff');
  const [result, setResult] = useState<Result | null>(null);
  const job = useJob<Result>('gif_create');

  const discard = () =>
    setResult((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });

  const edit = (next: SortableImage[]) => {
    job.reset();
    discard();
    setFrames(next);
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files, 'browser');
    const problems = problem ? [problem] : [];
    const room = Math.max(0, MAX_GIF_FRAMES - frames.length);
    if (accepted.length > room) problems.push(`Up to ${MAX_GIF_FRAMES} frames — ${plural(accepted.length - room, 'image')} skipped.`);
    setNotice(problems.length ? problems.join(' ') : null);
    if (!accepted.length || !room) return;
    edit([...frames, ...accepted.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file }))]);
  };

  const change = (update: () => void) => {
    job.reset();
    discard();
    update();
  };

  const run = () =>
    job.run(async (progress) => {
      const side = Number(maxSide);
      const pictures: HTMLImageElement[] = [];
      for (const frame of frames) {
        const url = URL.createObjectURL(frame.file);
        try {
          const image = await loadImage(url);
          if (image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS) {
            throw new Error(`“${frame.file.name}” is too large to use in the browser.`);
          }
          pictures.push(image);
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      // Every frame is the size of the first picture, so the animation doesn't jump around.
      const { width, height } = gifSize(pictures[0].naturalWidth, pictures[0].naturalHeight, side);
      const { canvas, context } = createCanvas(width, height);
      const data = pictures.map((image) => {
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
        const s = coverSource(image.naturalWidth, image.naturalHeight, { x: 0, y: 0, width, height }, fit);
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, s.sx, s.sy, s.sWidth, s.sHeight, s.dx, s.dy, s.dWidth, s.dHeight);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      });

      const sequence = bounce ? pingPong(data) : data;
      const bytes = await encodeGif(sequence, { width, height, delay, once: !loop }, progress);
      const blob = new Blob([bytes as BlobPart], { type: 'image/gif' });
      const made: Result = { blob, url: URL.createObjectURL(blob), width, height, frames: sequence.length };
      setResult((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return made;
      });
      return made;
    });

  const main =
    frames.length === 0 ? (
      <div className="space-y-3">
        <FileDrop
          accept={BROWSER_IMAGE_TYPES}
          multiple
          onFiles={add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose images"
          hint={`${BROWSER_IMAGE_HINT} · ${MIN_FRAMES}–${MAX_GIF_FRAMES} frames`}
          icon={ImageUp}
        />
        {notice && <Message tone="error">{notice}</Message>}
      </div>
    ) : (
      <DropTarget onFiles={add} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium">
            {plural(frames.length, 'frame')}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {frames.length}/{MAX_GIF_FRAMES}
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
          {frames.length < MAX_GIF_FRAMES && (
            <AddFilesButton accept={BROWSER_IMAGE_TYPES} multiple onFiles={add} label="Add images" />
          )}
        </div>
        {notice && <Message tone="error">{notice}</Message>}
        {result && (
          <figure className="space-y-2">
            <div className="bg-checker flex justify-center rounded-xl border border-border p-3">
              <img src={result.url} alt="Your animated GIF" className="max-h-[420px] max-w-full rounded-sm" />
            </div>
            <figcaption className="text-center font-mono text-[11px] text-muted-foreground tabular">
              {result.width}×{result.height} px · {plural(result.frames, 'frame')} · {formatBytes(result.blob.size)}
            </figcaption>
          </figure>
        )}
        <p className="text-xs text-muted-foreground">
          <span className="[@media(hover:none)]:hidden">Drag cards</span>
          <span className="hidden [@media(hover:none)]:inline">Press and hold a card, then drag it</span> to set the
          order the frames play in.
        </p>
        <ImageSortGrid
          items={frames}
          onReorder={edit}
          onRemove={(id) => edit(frames.filter((frame) => frame.id !== id))}
          noun="Frame"
        />
      </DropTarget>
    );

  const sidebar = result ? (
    <ResultPanel
      title="Your GIF is ready"
      downloadLabel="Download GIF"
      onDownload={() => downloadBlob(result.blob, 'animation.gif')}
      onStartOver={() => {
        job.reset();
        edit([]);
      }}
    >
      <p className="text-sm text-muted-foreground">
        {plural(result.frames, 'frame')} at {(delay / 1000).toFixed(delay % 100 ? 2 : 1)} s each,{' '}
        {loop ? 'looping forever' : 'playing once'}.
      </p>
      <Button variant="outline" block onClick={() => change(() => {})}>
        Change settings
      </Button>
    </ResultPanel>
  ) : (
    <>
      <Panel title="Animation">
        <div className="space-y-4">
          <Slider
            label="Time per frame"
            value={delay}
            min={50}
            max={2000}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(next) => change(() => setDelay(next))}
          />
          <Checkbox checked={loop} label="Loop forever" description="Turn off to play once and stop." onChange={(next) => change(() => setLoop(next))} />
          <Checkbox checked={bounce} label="Bounce back and forth" description="Plays forwards, then backwards." onChange={(next) => change(() => setBounce(next))} />
        </div>
      </Panel>
      <Panel title="Size">
        <div className="space-y-4">
          <Field label="Longest side (px)" hint="Smaller GIFs load faster. All frames take the shape of the first image.">
            <Segmented<string>
              label="GIF size"
              value={maxSide}
              onChange={(next) => change(() => setMaxSide(next))}
              options={SIZES.map(({ value, label }) => ({ value, label }))}
            />
          </Field>
          <Field label="Other images">
            <Segmented<Fit>
              label="How frames fit"
              value={fit}
              onChange={(next) => change(() => setFit(next))}
              options={[
                { value: 'fill', label: 'Crop to fill' },
                { value: 'fit', label: 'Show whole image' },
              ]}
            />
          </Field>
          {fit === 'fit' && (
            <Field label="Background">
              <ColorSwatches
                label="Background colour"
                value={background}
                colors={['#ffffff', '#111111', '#f4efe6', '#dbeafe']}
                onChange={(color) => change(() => setBackground(color))}
              />
            </Field>
          )}
        </div>
      </Panel>
      <ActionPanel
        label="Make GIF"
        disabledReason={frames.length < MIN_FRAMES ? `Add ${MIN_FRAMES - frames.length === 1 ? 'one more image' : 'two or more images'}.` : null}
        job={job.state}
        onRun={() => void run()}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        GIFs use at most 256 colours per frame, so photos look a little grainier than the originals.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={frames.length > 0} />;
}
