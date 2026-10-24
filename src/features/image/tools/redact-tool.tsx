import { useEffect, useRef, useState } from 'react';
import { Eraser, Plus, Undo2 } from 'lucide-react';

import {
  ActionPanel,
  ChoiceList,
  Message,
  Panel,
  Slider,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
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
import {
  centeredRect,
  clampRect,
  nudgeRect,
  rectFromPoints,
  toImagePoint,
  type ArrowKey,
  type Point,
} from '@/features/image/lib/edit-geometry';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  extensionFor,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import type { Rect } from '@/features/image/lib/pixel-ops';
import {
  STRENGTH_DEFAULT,
  STRENGTH_MAX,
  STRENGTH_MIN,
  applyRedactions,
  redactionAmount,
  type RedactMode,
} from '@/features/image/lib/redaction';
import { useDecodedImage } from '@/features/image/lib/use-decoded-image';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { plural } from '@/lib/format';
import { getTool } from '@/lib/tools';

const tool = getTool('image-redact');

/** Smallest box worth keeping, in on-screen pixels; smaller drags are treated as stray clicks. */
const MIN_BOX_SCREEN_PX = 8;

const ARROW_KEYS: string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

const MODES: { value: RedactMode; label: string; description: string; badge?: string }[] = [
  {
    value: 'blackout',
    label: 'Black box',
    description: 'A solid block. Nothing underneath survives — use it for text, numbers and faces.',
    badge: 'Safest',
  },
  {
    value: 'pixelate',
    label: 'Pixelate',
    description: 'A coarse mosaic. Good for faces and plates; avoid for small text.',
  },
  {
    value: 'blur',
    label: 'Blur',
    description: 'A soft smudge. Looks natural, but is the easiest to partly undo.',
  },
];

export function RedactTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [regions, setRegions] = useState<Rect[]>([]);
  const [mode, setMode] = useState<RedactMode>('blackout');
  const [strength, setStrength] = useState(STRENGTH_DEFAULT);
  const [draft, setDraft] = useState<{ start: Point; current: Point } | null>(null);
  const job = useJob<void>('image_redact');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Which box to move keyboard focus to once it has rendered (a new box, or the next after a delete).
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const previewUrl = useObjectUrl(file);
  const { image, error, loading } = useDecodedImage(previewUrl);
  const natural = image ? { width: image.naturalWidth, height: image.naturalHeight } : null;

  // Redraw the preview whenever the image, the boxes or the method change.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context || !image) return;
    const { width, height, scale } = fitWithin(
      image.naturalWidth,
      image.naturalHeight,
      PREVIEW_MAX_SIDE,
    );
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    const amount = redactionAmount(mode, strength, {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    applyRedactions(context, regions, mode, amount, scale);
  }, [image, regions, mode, strength]);

  useEffect(() => {
    if (focusIndex === null) return;
    boxRefs.current[focusIndex]?.focus();
    // One-shot request: clearing it after the focus call is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusIndex(null);
  }, [focusIndex, regions]);

  const edit = (update: () => void) => {
    job.reset();
    update();
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (!accepted[0]) return;
    edit(() => {
      setRegions([]);
      setDraft(null);
      setFile(accepted[0]);
    });
  };

  const clear = () =>
    edit(() => {
      setFile(null);
      setNotice(null);
      setRegions([]);
      setDraft(null);
    });

  const pointFrom = (event: React.PointerEvent<HTMLDivElement>): Point | null => {
    if (!natural) return null;
    return toImagePoint(
      { x: event.clientX, y: event.clientY },
      event.currentTarget.getBoundingClientRect(),
      natural.width,
      natural.height,
    );
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const point = pointFrom(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ start: point, current: point });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointFrom(event);
    if (draft && point) setDraft({ ...draft, current: point });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointFrom(event);
    const current = draft;
    setDraft(null);
    if (!current || !point || !natural) return;
    const box = clampRect(rectFromPoints(current.start, point), natural.width, natural.height);
    const minimum = MIN_BOX_SCREEN_PX * (natural.width / event.currentTarget.clientWidth);
    if (box && box.width >= minimum && box.height >= minimum) {
      edit(() => setRegions((existing) => [...existing, box]));
    }
  };

  const addBox = () => {
    if (!natural) return;
    edit(() => setRegions((existing) => [...existing, centeredRect(natural, 0.25)]));
    setFocusIndex(regions.length);
  };

  const onBoxKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!natural) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      edit(() => setRegions((existing) => existing.filter((_, i) => i !== index)));
      // The next box slides into this slot; fall back to the previous one at the end.
      if (regions.length > 1) setFocusIndex(Math.min(index, regions.length - 2));
      return;
    }
    if (!ARROW_KEYS.includes(event.key)) return;
    event.preventDefault();
    const step = Math.max(1, Math.round(Math.max(natural.width, natural.height) * 0.01));
    edit(() =>
      setRegions((existing) =>
        existing.map((box, i) =>
          i === index ? nudgeRect(box, event.key as ArrowKey, step, event.shiftKey, natural) : box,
        ),
      ),
    );
  };

  const save = () => {
    if (!file || !image) return;
    void job.run(async () => {
      const mime = outputMime(file.type);
      const { canvas, context } = createCanvas(image.naturalWidth, image.naturalHeight);
      paintBackground(context, mime);
      context.drawImage(image, 0, 0);
      const amount = redactionAmount(mode, strength, {
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      applyRedactions(context, regions, mode, amount, 1);
      const blob = await canvasToBlob(canvas, mime);
      downloadBlob(blob, `${stem(file.name)}-redacted.${extensionFor(mime)}`);
    });
  };

  const draftBox =
    draft && natural
      ? clampRect(rectFromPoints(draft.start, draft.current), natural.width, natural.height)
      : null;

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
      {image && natural && (
        <>
          <p className="text-sm text-muted-foreground">
            Drag over anything you want to hide — faces, names, numbers, plates.
          </p>
          <CanvasFrame ref={canvasRef} label="Image with the selected areas hidden">
            <div
              aria-label="Drawing area: drag to draw a box over what you want to hide"
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDraft(null)}
            >
              {regions.map((region, index) => (
                <Outline
                  key={index}
                  box={region}
                  natural={natural}
                  keyboard={{
                    label: `Hidden area ${index + 1} of ${regions.length}. Arrow keys move it, Shift and arrow keys resize it, Delete removes it.`,
                    onKeyDown: onBoxKeyDown(index),
                    ref: (element) => {
                      boxRefs.current[index] = element;
                    },
                  }}
                />
              ))}
              {draftBox && <Outline box={draftBox} natural={natural} draft />}
            </div>
          </CanvasFrame>
        </>
      )}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel
        title="Hidden areas"
        action={
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" disabled={!image} onClick={addBox}>
              <Plus />
              Add box
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={regions.length === 0}
              onClick={() => edit(() => setRegions((existing) => existing.slice(0, -1)))}
            >
              <Undo2 />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={regions.length === 0}
              onClick={() => edit(() => setRegions([]))}
            >
              <Eraser />
              Clear
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {regions.length ? (
            <>
              <strong className="text-foreground">{plural(regions.length, 'area')}</strong> will be
              hidden.
            </>
          ) : (
            'None yet — draw a box on the image.'
          )}
        </p>
        <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
          Without a mouse: choose Add box, then use the arrow keys to move it and Shift with the
          arrows to resize it. Tab switches between boxes; Delete removes one.
        </p>
      </Panel>
      <Panel title="How to hide it">
        <div className="space-y-4">
          <ChoiceList
            label="How to hide the selected areas"
            value={mode}
            onChange={(next) => edit(() => setMode(next))}
            options={MODES}
          />
          {mode !== 'blackout' && (
            <Slider
              label="Strength"
              value={strength}
              min={STRENGTH_MIN}
              max={STRENGTH_MAX}
              onChange={(next) => edit(() => setStrength(next))}
            />
          )}
        </div>
      </Panel>
      <ActionPanel
        label="Download image"
        disabledReason={
          !image ? 'Add an image first.' : regions.length === 0 ? 'Draw a box over what to hide.' : null
        }
        job={job.state}
        onRun={save}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        The hidden pixels are replaced in the saved file, not just covered. Camera metadata such as
        location isn’t kept.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}

/** A dashed box over the preview, positioned as a percentage so it tracks any display size. */
function Outline({
  box,
  natural,
  draft = false,
  keyboard,
}: {
  box: Rect;
  natural: { width: number; height: number };
  draft?: boolean;
  /** Makes the box a keyboard-operable control. */
  keyboard?: {
    label: string;
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    ref: (element: HTMLDivElement | null) => void;
  };
}) {
  return (
    <div
      {...(keyboard
        ? {
            ref: keyboard.ref,
            role: 'group',
            tabIndex: 0,
            'aria-label': keyboard.label,
            onKeyDown: keyboard.onKeyDown,
          }
        : { 'aria-hidden': true })}
      className={
        draft
          ? 'pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10'
          : 'pointer-events-none absolute border-2 border-dashed border-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.45)] outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/40'
      }
      style={{
        left: `${(box.x / natural.width) * 100}%`,
        top: `${(box.y / natural.height) * 100}%`,
        width: `${(box.width / natural.width) * 100}%`,
        height: `${(box.height / natural.height) * 100}%`,
      }}
    />
  );
}
