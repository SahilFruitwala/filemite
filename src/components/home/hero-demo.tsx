import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ImageDown, Plus, RotateCcw } from 'lucide-react';

import { Mite, MiteStage } from '@/components/shell/mite';
import { Confetti } from '@/components/tool/tool-ui';
import { formatBytes } from '@/lib/format';
import { handOff } from '@/lib/handoff';
import { fileKind, toolsForFiles, type FileKind } from '@/lib/tools';
import { cn } from '@/lib/utils';

type DemoFile = { name: string; bytes: number; hue: number };

/** Pretend files lying on the "desk" next to the browser card. */
const DESK: DemoFile[] = [
  { name: 'holiday-0142.heic', bytes: 4.2e6, hue: 205 },
  { name: 'banner@2x.png', bytes: 2.9e6, hue: 35 },
  { name: 'cat-on-keyboard.jpg', bytes: 6.8e6, hue: 150 },
];
const TILTS = ['-rotate-6', 'rotate-3', '-rotate-2'];

const DRAG_TYPE = 'application/x-filemite-demo';
const WORK_MS = 3000;
const PICK_ACCEPT = 'image/*,.heic,.heif,application/pdf,.pdf';

type State =
  | { phase: 'idle' }
  | { phase: 'work'; file: DemoFile }
  | { phase: 'done'; file: DemoFile; after: number; round: number }
  | { phase: 'pick'; files: File[]; kind: FileKind | null };

/**
 * A pretend compress tool on the landing page. Visitors drag one of the sample
 * files (or tap it) onto Mite to watch it get compressed. Real files, dropped
 * or picked with the plus button, get a list of tools that can open them; the
 * chosen tool receives them in memory, so nothing is uploaded from here.
 */
export function HeroDemo() {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [hovering, setHovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eaten, setEaten] = useState<string[]>([]);
  const depth = useRef(0);
  const rounds = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Run the work phase: count progress up, then land the result.
  useEffect(() => {
    if (state.phase !== 'work') return;
    const { file } = state;
    const started = performance.now();
    const timer = setInterval(() => {
      const value = Math.min(1, (performance.now() - started) / WORK_MS);
      setProgress(value);
      if (value < 1) return;
      clearInterval(timer);
      rounds.current += 1;
      setState({
        phase: 'done',
        file,
        after: Math.round(file.bytes * (0.1 + Math.random() * 0.1)),
        round: rounds.current,
      });
    }, 50);
    return () => clearInterval(timer);
  }, [state]);

  const feed = (file: DemoFile) => {
    if (state.phase === 'work') return;
    setProgress(0);
    setHovering(false);
    setEaten((list) => (DESK.some((d) => d.name === file.name) ? [...list, file.name] : list));
    setState({ phase: 'work', file });
  };

  const pick = (files: File[]) => {
    if (state.phase === 'work' || !files.length) return;
    const kinds = new Set(files.map(fileKind));
    const kind = kinds.size === 1 ? [...kinds][0] : null;
    setState({ phase: 'pick', files, kind });
  };

  const reset = () => {
    setEaten([]);
    setState({ phase: 'idle' });
  };

  const accepts = (event: React.DragEvent) =>
    event.dataTransfer.types.includes(DRAG_TYPE) || event.dataTransfer.types.includes('Files');

  const dropHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      if (!accepts(event) || state.phase === 'work') return;
      event.preventDefault();
      depth.current++;
      setHovering(true);
    },
    onDragOver: (event: React.DragEvent) => {
      if (accepts(event) && state.phase !== 'work') event.preventDefault();
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setHovering(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setHovering(false);
      const demo = DESK.find((d) => d.name === event.dataTransfer.getData(DRAG_TYPE));
      if (demo) feed(demo);
      else pick(Array.from(event.dataTransfer.files));
    },
  };

  const desk = DESK.filter((file) => !eaten.includes(file.name));

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 delay-150 duration-700 fill-mode-both">
      <div {...dropHandlers} className="sticker relative rounded-3xl bg-card p-2.5 lg:rotate-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="eyebrow">
            {state.phase === 'pick' ? 'filemite.com' : 'filemite.com/image/compress'}
          </span>
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-border-strong" />
            <span className="size-2 rounded-full bg-border-strong" />
            <span className="size-2 rounded-full bg-border-strong" />
          </span>
        </div>

        <div
          data-section="image"
          className="relative h-[19rem] overflow-hidden rounded-2xl border-2 border-border bg-background"
          aria-live="polite"
        >
          {state.phase === 'idle' && (
            <div
              className={cn(
                'absolute inset-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-[background-color,border-color,transform] duration-300',
                hovering ? 'scale-[1.02] border-ink bg-primary-soft' : 'border-border-strong',
              )}
            >
              <Mite mood={hovering ? 'hungry' : 'idle'} className="size-24" />
              <p className="mt-2 font-display text-xl font-semibold">
                {hovering ? 'Feed me! 🍪' : 'Drop a file on me'}
              </p>
              <p className="mt-0.5 px-4 text-xs text-muted-foreground">
                {hovering
                  ? 'Let go, I’m starving.'
                  : 'Add your images or PDFs, or try a sample file below.'}
              </p>
              {!hovering && (
                <AddFiles onClick={() => inputRef.current?.click()} className="mt-3" />
              )}
            </div>
          )}

          {state.phase === 'pick' && (
            <ToolPicker files={state.files} kind={state.kind} onBack={reset} />
          )}

          {state.phase === 'work' && (
            <div className="absolute inset-0 flex animate-in fade-in zoom-in-95 flex-col items-center justify-center px-6 duration-300">
              <MiteStage progress={progress} className="max-w-72" />
              <p className="mt-1 font-display text-3xl font-bold tabular">
                {Math.round(progress * 100)}%
              </p>
              <p className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
                Chewing on {state.file.name}…
              </p>
            </div>
          )}

          {state.phase === 'done' && (
            <Result
              file={state.file}
              after={state.after}
              round={state.round}
              hovering={hovering}
              onAgain={reset}
              onAdd={() => inputRef.current?.click()}
            />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={PICK_ACCEPT}
          multiple
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            pick(Array.from(event.target.files ?? []));
            // Reset so picking the same file again still fires change.
            event.target.value = '';
          }}
        />
      </div>

      {/* The "desk": pretend files to drag (or tap) into the card. */}
      <div className="relative mt-6 flex min-h-16 flex-wrap items-center justify-center gap-3 lg:-mr-4">
        {desk.map((file, i) => (
          <button
            key={file.name}
            type="button"
            draggable
            disabled={state.phase === 'work'}
            onDragStart={(event) => {
              event.dataTransfer.setData(DRAG_TYPE, file.name);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => feed(file)}
            aria-label={`Compress the sample file ${file.name}`}
            className={cn(
              'sticker flex animate-in zoom-in-50 fade-in fill-mode-both cursor-grab items-center gap-2 rounded-xl bg-card p-2 pr-3 text-left duration-300 active:cursor-grabbing disabled:opacity-50',
              TILTS[i % TILTS.length],
            )}
            style={{ animationDelay: `${400 + i * 120}ms` }}
          >
            <FileThumb hue={file.hue} />
            <span>
              <span className="block font-mono text-[11px] font-semibold">{file.name}</span>
              <span className="block font-mono text-[10px] text-muted-foreground">
                {formatBytes(file.bytes)}
              </span>
            </span>
          </button>
        ))}
        {desk.length === 0 && state.phase !== 'work' && (
          <p className="font-mono text-xs text-muted-foreground">
            Mite ate everything. Hit “Feed another”, or drop your own file.
          </p>
        )}
        <span className="pointer-events-none absolute -top-5 left-0 hidden -rotate-6 font-mono text-[11px] text-muted-foreground lg:block">
          ↑ drag one up, or tap
        </span>
      </div>
    </div>
  );
}

function ToolPicker({
  files,
  kind,
  onBack,
}: {
  files: File[];
  kind: FileKind | null;
  onBack: () => void;
}) {
  const matches = kind ? toolsForFiles(kind, files.length) : [];
  const what = kind === 'pdf' ? 'PDF' : kind === 'image' ? 'image' : 'file';
  // Few matches get big tiles that fill the card; many stay compact and scroll.
  const roomy = matches.length <= 8;
  const cols =
    matches.length === 1
      ? 'grid-cols-1'
      : matches.length === 2 || matches.length === 4
        ? 'grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-3';
  const summary =
    files.length === 1 ? files[0].name : `${files.length} ${what}s`;

  return (
    <div className="absolute inset-0 flex animate-in fade-in zoom-in-95 flex-col p-3 duration-300">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <span className="flex min-w-0 items-center gap-2">
          <Mite mood={matches.length ? 'happy' : 'idle'} className="size-9 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-mono text-[11px] font-semibold">{summary}</span>
            <span className="block text-xs text-muted-foreground">
              {matches.length ? 'What should I do with it?' : 'I can’t open that mix.'}
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <RotateCcw className="size-3" />
          Start over
        </button>
      </div>

      {matches.length ? (
        <ul
          className={cn(
            'grid min-h-0 flex-1 gap-1.5 overflow-y-auto p-1',
            cols,
            roomy ? 'auto-rows-[minmax(3.5rem,1fr)]' : 'auto-rows-[minmax(2.5rem,1fr)]',
          )}
        >
          {matches.map((tool) => (
            <li key={tool.id}>
              <Link
                to={tool.href}
                data-section={tool.section}
                onClick={() => handOff(files)}
                className={cn(
                  'flex h-full rounded-lg border-2 border-border bg-card px-2 py-1.5 font-semibold transition-[border-color,transform] hover:-translate-y-0.5 hover:border-ink',
                  roomy
                    ? 'flex-col items-center justify-center gap-1.5 text-center text-sm'
                    : 'items-center gap-2 text-left text-xs',
                )}
              >
                <tool.icon className={cn('shrink-0 text-primary', roomy ? 'size-6' : 'size-4')} />
                {/* Out of its section's context, "From images" doesn't say it makes a PDF. */}
                <span className="max-w-full truncate">
                  {tool.id === 'pdf-from-images' ? 'To PDF' : tool.shortTitle}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-auto max-w-64 text-center text-sm text-muted-foreground">
          Add images or PDFs, one kind at a time, and I’ll show the tools that fit.
        </p>
      )}
    </div>
  );
}

function FileThumb({ hue }: { hue: number }) {
  return (
    <span
      aria-hidden
      className="size-9 shrink-0 rounded-md border-2 border-ink"
      style={{
        background: `linear-gradient(160deg, oklch(0.85 0.1 ${hue}), oklch(0.6 0.15 ${hue + 40}))`,
      }}
    />
  );
}

function Result({
  file,
  after,
  round,
  hovering,
  onAgain,
  onAdd,
}: {
  file: DemoFile;
  after: number;
  round: number;
  hovering: boolean;
  onAgain: () => void;
  onAdd: () => void;
}) {
  const saved = Math.round((1 - after / file.bytes) * 100);
  return (
    <div
      className={cn(
        'absolute inset-0 flex animate-in fade-in zoom-in-95 flex-col items-center justify-center gap-3 px-6 transition-colors duration-300',
        hovering && 'bg-primary-soft',
      )}
    >
      <span className="relative">
        <Confetti key={round} pieces={22} />
        <Mite mood={hovering ? 'hungry' : 'happy'} className="size-20" />
      </span>
      <div className="w-full max-w-72 rounded-xl border-2 border-ink bg-card p-3 shadow-pop">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <ImageDown className="size-4 shrink-0 text-primary" />
            <span className="truncate font-mono text-xs">{file.name}</span>
          </span>
          <span className="animate-pop shrink-0 -rotate-3 rounded-full border-2 border-ink bg-primary px-2 py-0.5 font-mono text-[11px] font-semibold text-primary-foreground">
            −{saved}%
          </span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
          <div className="animate-grow-x h-full rounded-full bg-primary" style={{ width: `${100 - saved}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span className="line-through">{formatBytes(file.bytes)}</span>
          <span className="font-semibold text-foreground">{formatBytes(after)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <AddFiles onClick={onAdd} />
        <button
          type="button"
          onClick={onAgain}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <RotateCcw className="size-3" />
          Feed another
        </button>
      </div>
    </div>
  );
}

/** Opens the picker for the visitor's own images or PDFs. */
function AddFiles({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Choose images or PDFs"
      className={cn(
        'sticker inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-transform hover:-rotate-2',
        className,
      )}
    >
      <Plus className="size-4" />
      Add files
    </button>
  );
}
