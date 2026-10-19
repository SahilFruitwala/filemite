import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Circle,
  Hash,
  Highlighter,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';

import { MarkupStage, type ToolStyle } from '@/components/markup/markup-stage';
import { ToolPalette, type PaletteTool } from '@/components/markup/tool-palette';
import { ColorSwatches, HIGHLIGHT_COLORS, INK_COLORS } from '@/components/tool/color-swatches';
import {
  ActionPanel,
  Checkbox,
  Message,
  Panel,
  Slider,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import { canvasToBlob, createCanvas, outputMime, paintBackground } from '@/features/image/lib/canvas';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  extensionFor,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import { paintMarks } from '@/features/image/lib/paint-marks';
import { useDecodedImage } from '@/features/image/lib/use-decoded-image';
import { useEditorItems } from '@/features/pdf/hooks/use-editor-items';
import type { EditorTool } from '@/features/pdf/lib/editor-items';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { plural } from '@/lib/format';
import { getTool } from '@/lib/tools';

const tool = getTool('image-annotate');

const TOOLS: PaletteTool[] = [
  { value: 'select', label: 'Move', icon: MousePointer2, hint: 'Select, move and resize what you’ve added. Delete removes it.' },
  { value: 'arrow', label: 'Arrow', icon: ArrowUpRight, hint: 'Drag from the tail to the tip.' },
  { value: 'text', label: 'Text', icon: Type, hint: 'Click where the text should start, then type.' },
  { value: 'rect', label: 'Rectangle', icon: Square, hint: 'Drag to draw a box around something.' },
  { value: 'ellipse', label: 'Ellipse', icon: Circle, hint: 'Drag to circle something.' },
  { value: 'step', label: 'Step', icon: Hash, hint: 'Click to drop a numbered marker: 1, 2, 3…' },
  { value: 'highlight', label: 'Highlight', icon: Highlighter, hint: 'Drag over text to highlight it.' },
  { value: 'pen', label: 'Draw', icon: Pencil, hint: 'Draw freehand with the mouse or your finger.' },
  { value: 'line', label: 'Line', icon: Minus, hint: 'Drag to draw a straight line.' },
];

type Overrides = {
  ink?: string;
  highlight?: string;
  fill?: boolean;
  strokeWidth?: number;
  fontSize?: number;
  markSize?: number;
};

export function AnnotateImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const editor = useEditorItems();
  const job = useJob<void>();
  const [current, setCurrent] = useState<EditorTool>('arrow');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});

  const previewUrl = useObjectUrl(file);
  const { image, error, loading } = useDecodedImage(previewUrl);
  const natural = image ? { width: image.naturalWidth, height: image.naturalHeight } : null;

  // Sizes scale with the picture, so marks look the same on a phone screenshot and a 12 MP photo.
  const base = natural ? Math.max(natural.width, natural.height) : 1000;
  const defaults = useMemo(
    () => ({
      ink: '#d92d20',
      highlight: '#ffe600',
      fill: false,
      strokeWidth: Math.max(2, Math.round(base / 250)),
      fontSize: Math.max(14, Math.round(base / 40)),
      markSize: Math.max(24, Math.round(base / 28)),
    }),
    [base],
  );
  const values = { ...defaults, ...overrides };
  const selected = editor.items.find((item) => item.id === selectedId) ?? null;

  const kind = selected?.kind ?? current;
  const highlighting = kind === 'highlight';
  const showsText = kind === 'text';
  const showsStroke = ['rect', 'ellipse', 'line', 'arrow', 'pen'].includes(kind);
  const showsFill = kind === 'rect' || kind === 'ellipse';
  const showsMark = kind === 'step' || kind === 'mark';

  const edit = (patch: Overrides, itemPatch?: Record<string, unknown>) => {
    job.reset();
    setOverrides((existing) => ({ ...existing, ...patch }));
    if (selected && itemPatch) editor.patch(selected.id, itemPatch as never);
  };

  const toolStyle: ToolStyle = {
    color: current === 'highlight' ? values.highlight : values.ink,
    fill: values.fill ? values.ink : null,
    strokeWidth: values.strokeWidth,
    fontSize: values.fontSize,
    markSize: values.markSize,
  };

  const reset = () => {
    job.reset();
    editor.clear();
    setSelectedId(null);
    setEditingId(null);
    setOverrides({});
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (!accepted[0]) return;
    reset();
    setFile(accepted[0]);
  };

  const clear = () => {
    reset();
    setFile(null);
    setNotice(null);
  };

  const save = () => {
    if (!file || !image) return;
    void job.run(async () => {
      const mime = outputMime(file.type);
      const { canvas, context } = createCanvas(image.naturalWidth, image.naturalHeight);
      paintBackground(context, mime);
      context.drawImage(image, 0, 0);
      // Text is drawn with the system font; make sure it is ready before painting.
      await document.fonts.ready;
      paintMarks(context, editor.items);
      const blob = await canvasToBlob(canvas, mime);
      downloadBlob(blob, `${stem(file.name)}-annotated.${extensionFor(mime)}`);
    });
  };

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
      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Opening image…</p>}
      {image && natural && previewUrl && (
        <MarkupStage
          size={natural}
          imageUrl={previewUrl}
          pageIndex={0}
          maxWidth={1100}
          editor={{
            ...editor,
            add: (item) => {
              job.reset();
              editor.add(item);
            },
          }}
          tool={current}
          style={toolStyle}
          selectedId={selectedId}
          onSelect={setSelectedId}
          editingId={editingId}
          onEditing={setEditingId}
          onToolChange={setCurrent}
          ariaLabel="Image. Choose a tool, then click or drag on the image."
          alt="The image you are marking up"
        />
      )}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel
        title="Tools"
        action={
          <Button
            variant="ghost"
            size="xs"
            disabled={!editor.canUndo}
            onClick={() => {
              job.reset();
              editor.undo();
            }}
          >
            <Undo2 />
            Undo
          </Button>
        }
      >
        <ToolPalette tools={TOOLS} value={current} onChange={setCurrent} disabled={!image} />
      </Panel>

      <Panel title={selected ? 'Selected mark' : 'Style'}>
        <div className="space-y-4">
          <ColorSwatches
            label="Colour"
            value={highlighting ? values.highlight : values.ink}
            colors={highlighting ? HIGHLIGHT_COLORS : INK_COLORS}
            onChange={(next) =>
              edit(highlighting ? { highlight: next } : { ink: next }, {
                color: next,
                ...((selected?.kind === 'rect' || selected?.kind === 'ellipse') && selected.fill ? { fill: next } : {}),
              })
            }
          />
          {showsText && (
            <Slider
              label="Text size"
              value={selected?.kind === 'text' ? selected.size : values.fontSize}
              min={8}
              max={Math.max(60, Math.round(base / 8))}
              format={(value) => `${value} px`}
              onChange={(next) => edit({ fontSize: next }, { size: next })}
            />
          )}
          {showsStroke && (
            <Slider
              label="Line thickness"
              value={values.strokeWidth}
              min={1}
              max={Math.max(16, Math.round(base / 40))}
              format={(value) => `${value} px`}
              onChange={(next) => edit({ strokeWidth: next }, { strokeWidth: next })}
            />
          )}
          {showsFill && (
            <Checkbox
              checked={
                selected && (selected.kind === 'rect' || selected.kind === 'ellipse') ? !!selected.fill : values.fill
              }
              label="Fill the shape"
              onChange={(next) =>
                edit(
                  { fill: next },
                  {
                    fill: next
                      ? selected?.kind === 'rect' || selected?.kind === 'ellipse'
                        ? selected.color
                        : values.ink
                      : null,
                  },
                )
              }
            />
          )}
          {showsMark && (
            <Slider
              label="Size"
              value={values.markSize}
              min={12}
              max={Math.max(80, Math.round(base / 6))}
              format={(value) => `${value} px`}
              onChange={(next) => edit({ markSize: next }, { w: next, h: next })}
            />
          )}
          {selected && (
            <Button
              variant="danger"
              block
              onClick={() => {
                job.reset();
                editor.remove(selected.id);
                setSelectedId(null);
              }}
            >
              <Trash2 />
              Delete this mark
            </Button>
          )}
        </div>
      </Panel>

      <ActionPanel
        label={editor.items.length ? `Download with ${plural(editor.items.length, 'mark')}` : 'Download image'}
        disabledReason={!image ? 'Add an image first.' : editor.items.length === 0 ? 'Add an arrow, box or text first.' : null}
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
