import { useEffect, useState } from 'react';
import { ImageDown, MousePointer2 } from 'lucide-react';

import { Mite, MiteStage } from '@/components/shell/mite';
import { Confetti } from '@/components/tool/tool-ui';
import { cn } from '@/lib/utils';

/** Sample files the demo cycles through. Sizes in MB. */
const FILES = [
  { name: 'holiday-0142.heic', from: 4.2, to: 0.61, hue: 205 },
  { name: 'banner@2x.png', from: 2.9, to: 0.38, hue: 35 },
  { name: 'cat-on-keyboard.jpg', from: 6.8, to: 0.94, hue: 150 },
];

// Timeline of one loop, in ms.
const DRAG = 1800;
const DROP = 2500;
const WORK = 5600;
const LOOP = 9000;
const TICK = 50;

type Phase = 'drag' | 'drop' | 'work' | 'done';

function phaseAt(t: number): Phase {
  if (t < DRAG) return 'drag';
  if (t < DROP) return 'drop';
  if (t < WORK) return 'work';
  return 'done';
}

/**
 * Decorative, looping walkthrough of the compress tool: a file is dragged in,
 * Mite chews it, and the smaller result pops out.
 */
export function HeroDemo() {
  const [t, setT] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    // Respect reduced motion: hold on the finished state.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const hold = setTimeout(() => setT(LOOP - 1));
      return () => clearTimeout(hold);
    }
    const timer = setInterval(() => {
      setT((value) => {
        if (value + TICK < LOOP) return value + TICK;
        setRound((r) => r + 1);
        return 0;
      });
    }, TICK);
    return () => clearInterval(timer);
  }, []);

  const file = FILES[round % FILES.length];
  const phase = phaseAt(t);
  const progress = phase === 'work' ? Math.min(1, (t - DROP) / (WORK - DROP - 200)) : null;
  const saved = Math.round((1 - file.to / file.from) * 100);
  // The dragged file starts off to the side, then glides onto the drop zone.
  const arrived = t > 250;

  return (
    <div
      aria-hidden
      className="sticker relative animate-in fade-in slide-in-from-bottom-4 rounded-3xl bg-card p-2.5 delay-150 duration-700 fill-mode-both lg:rotate-2"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="eyebrow">filemite.com/image/compress</span>
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
        </span>
      </div>

      <div data-section="image" className="relative h-[19rem] overflow-hidden rounded-2xl border-2 border-border bg-background">
        {/* 1. Drop zone, waiting then hungry. */}
        {(phase === 'drag' || phase === 'drop') && (
          <div
            className={cn(
              'absolute inset-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-[background-color,border-color,transform] duration-300',
              phase === 'drop' || t > DRAG - 500
                ? 'scale-[1.02] border-ink bg-primary-soft'
                : 'border-border-strong',
            )}
          >
            <Mite mood={t > DRAG - 500 ? 'hungry' : 'idle'} className="size-20" />
            <p className="mt-2 font-display text-lg font-semibold">
              {t > DRAG - 500 ? 'Feed me! 🍪' : 'Drop images here'}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">PNG · JPEG · WebP · HEIC</p>
          </div>
        )}

        {/* The file being dragged in by a cursor. */}
        {phase === 'drag' || phase === 'drop' ? (
          <div
            className="absolute top-0 left-0 transition-[transform,opacity] ease-[cubic-bezier(0.5,0,0.2,1)]"
            style={{
              transitionDuration: phase === 'drop' ? '400ms' : '1400ms',
              transform: arrived
                ? phase === 'drop'
                  ? 'translate(10rem, 6rem) scale(0.2) rotate(20deg)'
                  : 'translate(8.5rem, 12rem) rotate(-4deg)'
                : 'translate(24rem, 15rem) rotate(8deg)',
              opacity: phase === 'drop' ? 0 : 1,
            }}
          >
            <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-card p-2 pr-3 shadow-pop">
              <span
                className="size-9 rounded-md border-2 border-ink"
                style={{
                  background: `linear-gradient(160deg, oklch(0.85 0.1 ${file.hue}), oklch(0.6 0.15 ${file.hue + 40}))`,
                }}
              />
              <span>
                <span className="block font-mono text-[11px] font-semibold">{file.name}</span>
                <span className="block font-mono text-[10px] text-muted-foreground">{file.from} MB</span>
              </span>
            </div>
            <MousePointer2 className="absolute -right-3 -bottom-4 size-6 fill-foreground stroke-background" />
          </div>
        ) : null}

        {/* 2. Mite at work. */}
        {phase === 'work' && (
          <div className="absolute inset-0 flex animate-in fade-in zoom-in-95 flex-col items-center justify-center px-6 duration-300">
            <MiteStage progress={progress} className="max-w-72" />
            <p className="mt-1 font-display text-3xl font-bold tabular">
              {Math.round((progress ?? 0) * 100)}%
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Chewing on {file.name}…
            </p>
          </div>
        )}

        {/* 3. Result. */}
        {phase === 'done' && (
          <div className="absolute inset-0 flex animate-in fade-in zoom-in-95 flex-col items-center justify-center gap-3 px-6 duration-300">
            <span className="relative">
              <Confetti key={round} pieces={22} />
              <Mite mood="happy" className="size-20" />
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
                <div
                  className="animate-grow-x h-full rounded-full bg-primary"
                  style={{ width: `${100 - saved}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span className="line-through">{file.from} MB</span>
                <span className="font-semibold text-foreground">{file.to} MB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
