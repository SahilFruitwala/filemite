import { useCallback, useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';

/**
 * Before/after slider. Drag anywhere on the image, or focus it and use the
 * arrow keys — the handle is a real range input underneath.
 */
export default function ImageCompare({
  original,
  compressed,
  leftLabel = 'Original',
  rightLabel = 'Optimized',
}: {
  original: string;
  compressed: string;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  const [aspect, setAspect] = useState<number | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const rect = container.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={container}
      className="bg-checker relative max-h-[70vh] w-full touch-none overflow-hidden rounded-xl border border-border select-none"
      style={{ aspectRatio: aspect ?? 16 / 10 }}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => dragging.current && moveTo(event.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <img
        src={compressed}
        alt={rightLabel}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
      />
      <img
        src={original}
        alt={leftLabel}
        draggable={false}
        onLoad={(event) =>
          setAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight || null)
        }
        className="absolute inset-0 size-full object-contain"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-800 shadow-lg">
          <MoveHorizontal className="size-4" />
        </span>
      </div>

      <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-white uppercase backdrop-blur">
        {leftLabel}
      </span>
      <span className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-primary-foreground uppercase">
        {rightLabel}
      </span>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(position)}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-label={`Compare ${leftLabel.toLowerCase()} and ${rightLabel.toLowerCase()}`}
        className="peer absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl ring-primary ring-inset peer-focus-visible:ring-2"
      />
    </div>
  );
}
