import { useEffect, useRef, useState } from 'react';

import { ColorSwatches } from '@/components/tool/color-swatches';
import { ActionPanel, Field, Message, Panel, Segmented, Slider, ToolLayout } from '@/components/tool/tool-ui';
import { CanvasFrame } from '@/features/image/components/canvas-frame';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import { PREVIEW_MAX_SIDE, canvasToBlob, createCanvas, fitWithin } from '@/features/image/lib/canvas';
import {
  ASPECTS,
  BACKDROPS,
  DEFAULT_BEAUTIFY,
  beautifyLayout,
  exportScale,
  paintBeautified,
  type Backdrop,
  type BeautifyOptions,
  type Frame,
} from '@/features/image/lib/beautify';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import { useDecodedImage } from '@/features/image/lib/use-decoded-image';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-beautify');

type Format = 'png' | 'jpeg';

function swatchStyle(backdrop: Backdrop): React.CSSProperties {
  if (backdrop.kind === 'gradient') {
    return { backgroundImage: `linear-gradient(${backdrop.angle}deg, ${backdrop.from}, ${backdrop.to})` };
  }
  if (backdrop.kind === 'solid') return { backgroundColor: backdrop.color };
  return {};
}

export function BeautifyTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [options, setOptions] = useState<BeautifyOptions>(DEFAULT_BEAUTIFY);
  const [backdropId, setBackdropId] = useState('sunset');
  const [custom, setCustom] = useState<string | null>(null);
  const [aspectId, setAspectId] = useState('auto');
  const [format, setFormat] = useState<Format>('png');
  const job = useJob<void>('image_beautify');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const previewUrl = useObjectUrl(file);
  const { image, error, loading } = useDecodedImage(previewUrl);

  const aspect = ASPECTS.find((item) => item.id === aspectId)?.ratio ?? null;
  const full: BeautifyOptions = { ...options, aspect };
  const backdrop: Backdrop = custom
    ? { kind: 'solid', color: custom }
    : (BACKDROPS.find((item) => item.id === backdropId)?.backdrop ?? { kind: 'none' });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !image) return;
    const layout = beautifyLayout(image.naturalWidth, image.naturalHeight, full);
    const { width, height, scale } = fitWithin(layout.width, layout.height, PREVIEW_MAX_SIDE);
    canvas.width = width;
    canvas.height = height;
    paintBeautified(context, image, layout, full, backdrop, scale);
    // `full` and `backdrop` are rebuilt every render; their parts are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, options, aspect, backdropId, custom]);

  const change = (patch: Partial<BeautifyOptions>) => {
    job.reset();
    setOptions((current) => ({ ...current, ...patch }));
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (!accepted[0]) return;
    job.reset();
    setFile(accepted[0]);
  };

  const save = () => {
    if (!file || !image) return;
    void job.run(async () => {
      const layout = beautifyLayout(image.naturalWidth, image.naturalHeight, full);
      const scale = exportScale(layout.width, layout.height);
      const { canvas, context } = createCanvas(
        Math.max(1, Math.round(layout.width * scale)),
        Math.max(1, Math.round(layout.height * scale)),
      );
      // JPEG has no transparency: a transparent backdrop becomes white.
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      if (format === 'jpeg') {
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      paintBeautified(context, image, layout, full, backdrop, scale);
      const blob = await canvasToBlob(canvas, mime, 0.95);
      downloadBlob(blob, `${stem(file.name)}-beautified.${format === 'jpeg' ? 'jpg' : 'png'}`);
    });
  };

  const layout = image ? beautifyLayout(image.naturalWidth, image.naturalHeight, full) : null;

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
      onClear={() => {
        job.reset();
        setFile(null);
        setNotice(null);
      }}
    >
      {error && <Message tone="error">{error}</Message>}
      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Opening image…</p>}
      {image && <CanvasFrame ref={canvasRef} label="Preview of the beautified screenshot" />}
      {layout && (
        <p className="text-center font-mono text-[11px] text-muted-foreground tabular">
          Saves as {layout.width}×{layout.height} px
        </p>
      )}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel title="Background">
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Background" className="grid grid-cols-5 gap-2">
            {BACKDROPS.map((item) => {
              const active = !custom && backdropId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => {
                    job.reset();
                    setCustom(null);
                    setBackdropId(item.id);
                  }}
                  className={cn(
                    'aspect-square rounded-lg border border-border-strong outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                    item.backdrop.kind === 'none' && 'bg-checker',
                    active && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
                  )}
                  style={swatchStyle(item.backdrop)}
                />
              );
            })}
          </div>
          <Field label="Or a solid colour">
            <ColorSwatches
              label="Solid background colour"
              value={custom ?? '#ffffff'}
              colors={['#ffffff', '#111111', '#f4efe6', '#dbeafe', '#fde68a', '#fecdd3']}
              onChange={(color) => {
                job.reset();
                setCustom(color);
              }}
            />
          </Field>
        </div>
      </Panel>
      <Panel title="Frame">
        <div className="space-y-4">
          <Slider label="Padding" value={options.padding} min={0} max={30} format={(v) => `${v}%`} onChange={(padding) => change({ padding })} />
          <Slider label="Rounded corners" value={options.radius} min={0} max={12} step={0.5} format={(v) => `${v}%`} onChange={(radius) => change({ radius })} />
          <Slider label="Shadow" value={options.shadow} min={0} max={100} format={(v) => `${v}%`} onChange={(shadow) => change({ shadow })} />
          <Field label="Window bar">
            <Segmented<Frame>
              label="Window bar"
              value={options.frame}
              onChange={(frame) => change({ frame })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Field>
          <Field label="Shape of the picture">
            <Segmented<string>
              label="Aspect ratio"
              value={aspectId}
              onChange={(next) => {
                job.reset();
                setAspectId(next);
              }}
              options={ASPECTS.map(({ id, label }) => ({ value: id, label }))}
            />
          </Field>
        </div>
      </Panel>
      <ActionPanel
        label="Download image"
        disabledReason={!image ? 'Add a screenshot first.' : null}
        job={job.state}
        onRun={save}
      >
        <Segmented<Format>
          label="File format"
          value={format}
          onChange={setFormat}
          options={[
            { value: 'png', label: 'PNG', title: 'Keeps a transparent background' },
            { value: 'jpeg', label: 'JPG', title: 'Smaller file; no transparency' },
          ]}
        />
      </ActionPanel>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
