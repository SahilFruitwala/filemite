import { useEffect, useMemo, useRef, useState } from "react";
import { FileWarning } from "lucide-react";

import type { EditorItems } from "@/features/pdf/hooks/use-editor-items";
import {
  DRAG_TOOLS,
  newId,
  type EditorItem,
  type EditorTool,
} from "@/features/pdf/lib/editor-items";
import {
  arrowGeometry,
  normalizeBox,
  stepText,
  TEXT_BASELINE,
  TEXT_LINE_HEIGHT,
  type Box,
} from "@/features/pdf/lib/overlay";
import {
  MIN_MARK_SIZE,
  centeredBox,
  moveBox,
  resizeBox,
  toPagePoint,
  type Corner,
  type PageSize,
} from "@/features/pdf/lib/overlay-geometry";

export const MARKUP_FONT = 'Helvetica, Arial, "Liberation Sans", sans-serif';
const HANDLE_CORNERS: Corner[] = ["nw", "ne", "sw", "se"];

export type ToolStyle = {
  color: string;
  /** Fill for rectangles and ellipses; null draws an outline only. */
  fill: string | null;
  strokeWidth: number;
  /** Font size, in the stage's own units. */
  fontSize: number;
  /** Side of a check mark, cross or numbered step. */
  markSize: number;
};

type Point = { x: number; y: number };

type Gesture =
  | { type: "move"; id: string; start: Point; original: EditorItem; moved: boolean }
  | { type: "resize"; id: string; corner: Corner; start: Point; original: Box; moved: boolean }
  | { type: "endpoint"; id: string; end: 1 | 2; start: Point; original: EditorItem; moved: boolean }
  | { type: "draw"; tool: EditorTool; start: Point; points: [number, number][] };

let measureContext: CanvasRenderingContext2D | null | undefined;

function textWidth(text: string, size: number): number {
  if (measureContext === undefined) {
    measureContext = document.createElement("canvas").getContext("2d");
  }
  const lines = text.split("\n");
  if (!measureContext) return Math.max(...lines.map((line) => line.length)) * size * 0.55;
  measureContext.font = `${size}px ${MARKUP_FONT}`;
  return Math.max(...lines.map((line) => measureContext!.measureText(line).width));
}

export function boundsOf(item: EditorItem): Box {
  if (item.kind === "text") {
    return {
      x: item.x,
      y: item.y,
      w: Math.max(textWidth(item.text || " ", item.size), item.size),
      h: item.text.split("\n").length * item.size * TEXT_LINE_HEIGHT,
    };
  }
  if (item.kind === "line") {
    return normalizeBox({ x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 });
  }
  if (item.kind === "pen") {
    const xs = item.points.map(([x]) => x);
    const ys = item.points.map(([, y]) => y);
    const pad = item.strokeWidth / 2;
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
  }
  return item;
}

function ItemShape({ item, draft = false }: { item: EditorItem; draft?: boolean }) {
  switch (item.kind) {
    case "rect":
      return (
        <rect
          x={item.x}
          y={item.y}
          width={item.w}
          height={item.h}
          fill={item.fill ?? "none"}
          stroke={item.strokeWidth > 0 ? item.color : "none"}
          strokeWidth={item.strokeWidth}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={item.x + item.w / 2}
          cy={item.y + item.h / 2}
          rx={item.w / 2}
          ry={item.h / 2}
          fill={item.fill ?? "none"}
          stroke={item.strokeWidth > 0 ? item.color : "none"}
          strokeWidth={item.strokeWidth}
        />
      );
    case "highlight":
      return (
        <rect
          x={item.x}
          y={item.y}
          width={item.w}
          height={item.h}
          fill={item.color}
          style={{ mixBlendMode: "multiply" }}
        />
      );
    case "redact":
      return (
        <rect
          x={item.x}
          y={item.y}
          width={item.w}
          height={item.h}
          fill="rgb(0 0 0 / 0.6)"
          stroke="#e5484d"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          opacity={draft ? 0.8 : 1}
        />
      );
    case "mark": {
      const { x, y, w, h } = item;
      const path =
        item.mark === "check"
          ? `M${x + w * 0.12} ${y + h * 0.55}L${x + w * 0.38} ${y + h * 0.82}L${x + w * 0.88} ${y + h * 0.18}`
          : `M${x + w * 0.15} ${y + h * 0.15}L${x + w * 0.85} ${y + h * 0.85}M${x + w * 0.85} ${y + h * 0.15}L${x + w * 0.15} ${y + h * 0.85}`;
      return (
        <path
          d={path}
          fill="none"
          stroke={item.color}
          strokeWidth={Math.max(1, Math.min(w, h) * 0.14)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    case "line": {
      const geometry = item.arrow
        ? arrowGeometry(item.x1, item.y1, item.x2, item.y2, item.strokeWidth)
        : null;
      return (
        <g stroke={item.color} strokeWidth={item.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <line
            x1={item.x1}
            y1={item.y1}
            x2={geometry ? geometry.shaftEnd[0] : item.x2}
            y2={geometry ? geometry.shaftEnd[1] : item.y2}
          />
          {geometry && (
            <polygon fill={item.color} points={geometry.head.map(([px, py]) => `${px},${py}`).join(" ")} />
          )}
        </g>
      );
    }
    case "pen":
      return (
        <polyline
          points={item.points.map(([px, py]) => `${px},${py}`).join(" ")}
          fill="none"
          stroke={item.color}
          strokeWidth={item.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "step": {
      const text = stepText(item, item.number);
      return (
        <g>
          <ellipse cx={item.x + item.w / 2} cy={item.y + item.h / 2} rx={item.w / 2} ry={item.h / 2} fill={item.color} />
          <text x={text.x} y={text.baseline} fontSize={text.size} fontFamily={MARKUP_FONT} fill="#fff">
            {item.number}
          </text>
        </g>
      );
    }
    case "text":
      return (
        <text fill={item.color} fontSize={item.size} fontFamily={MARKUP_FONT} style={{ whiteSpace: "pre" }}>
          {item.text.split("\n").map((line, index) => (
            <tspan
              key={index}
              x={item.x}
              y={item.y + item.size * TEXT_BASELINE + index * item.size * TEXT_LINE_HEIGHT}
            >
              {line || " "}
            </tspan>
          ))}
        </text>
      );
    case "image":
      return item.url ? (
        <image
          href={item.url}
          x={item.x}
          y={item.y}
          width={item.w}
          height={item.h}
          preserveAspectRatio="none"
        />
      ) : null;
  }
}

/**
 * A picture with marks laid over it: click or drag to add them, then select,
 * move and resize. Marks live in an SVG in the picture's own units (PDF points
 * or image pixels), so what is shown is what gets saved.
 */
export function MarkupStage({
  size,
  imageUrl,
  pageIndex,
  editor,
  tool,
  style,
  selectedId,
  onSelect,
  editingId,
  onEditing,
  onToolChange,
  ariaLabel,
  alt,
  maxWidth = 860,
}: {
  /** null when the picture can't be shown; undefined while it is loading. */
  size: PageSize | null | undefined;
  imageUrl: string | null | undefined;
  /** The `page` given to new marks, and the page whose marks are shown. */
  pageIndex: number;
  editor: EditorItems;
  tool: EditorTool;
  style: ToolStyle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  editingId: string | null;
  onEditing: (id: string | null) => void;
  onToolChange: (tool: EditorTool) => void;
  ariaLabel: string;
  alt: string;
  maxWidth?: number;
}) {
  const [draft, setDraft] = useState<EditorItem | null>(null);
  const [pxPerUnit, setPxPerUnit] = useState(1);
  const stage = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  const hasSize = !!size;
  useEffect(() => {
    const element = stage.current;
    if (!element || !size) return;
    const measure = () => setPxPerUnit(element.clientWidth / size.width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
    // Only the existence of a size matters; its identity changes with every page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSize, size?.width]);

  const pageItems = useMemo(
    () => editor.items.filter((item) => item.page === pageIndex),
    [editor.items, pageIndex]
  );
  const selected = pageItems.find((item) => item.id === selectedId) ?? null;
  const editing =
    pageItems.find(
      (item): item is Extract<EditorItem, { kind: "text" }> =>
        item.id === editingId && item.kind === "text"
    ) ?? null;

  const pointFrom = (event: React.PointerEvent | PointerEvent): Point | null => {
    const element = stage.current;
    if (!element || !size) return null;
    return toPagePoint({ x: event.clientX, y: event.clientY }, element.getBoundingClientRect(), size);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !size || editing) return;
    const point = pointFrom(event);
    if (!point) return;
    event.currentTarget.focus({ preventScroll: true });

    if (tool === "select") {
      const hit = (event.target as Element).closest("[data-item]")?.getAttribute("data-item");
      const item = pageItems.find((candidate) => candidate.id === hit);
      onSelect(item?.id ?? null);
      if (item) {
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { type: "move", id: item.id, start: point, original: item, moved: false };
      }
      return;
    }

    if (tool === "text" || tool === "check" || tool === "cross" || tool === "step") {
      const id = newId();
      if (tool === "text") {
        editor.add({
          id,
          kind: "text",
          page: pageIndex,
          x: Math.min(point.x, Math.max(0, size.width - style.fontSize * 3)),
          y: Math.min(point.y, Math.max(0, size.height - style.fontSize * TEXT_LINE_HEIGHT)),
          size: style.fontSize,
          color: style.color,
          text: "",
        });
        onSelect(id);
        onEditing(id);
      } else if (tool === "step") {
        const number =
          editor.items.reduce((highest, item) => (item.kind === "step" ? Math.max(highest, item.number) : highest), 0) + 1;
        editor.add({
          id,
          kind: "step",
          number,
          page: pageIndex,
          color: style.color,
          ...centeredBox(point, style.markSize, style.markSize, size),
        });
        onSelect(id);
      } else {
        editor.add({
          id,
          kind: "mark",
          mark: tool,
          page: pageIndex,
          color: style.color,
          ...centeredBox(point, style.markSize, style.markSize, size),
        });
        onSelect(id);
      }
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { type: "draw", tool, start: point, points: [[point.x, point.y]] };
    onSelect(null);
  };

  const startResize = (event: React.PointerEvent, item: EditorItem, corner: Corner) => {
    const point = pointFrom(event);
    if (!point || !stage.current) return;
    event.stopPropagation();
    stage.current.setPointerCapture(event.pointerId);
    gesture.current = { type: "resize", id: item.id, corner, start: point, original: boundsOf(item), moved: false };
  };

  const startEndpoint = (event: React.PointerEvent, item: EditorItem, end: 1 | 2) => {
    const point = pointFrom(event);
    if (!point || !stage.current) return;
    event.stopPropagation();
    stage.current.setPointerCapture(event.pointerId);
    gesture.current = { type: "endpoint", id: item.id, end, start: point, original: item, moved: false };
  };

  const drawn = (
    drawTool: EditorTool,
    start: Point,
    end: Point,
    points: [number, number][]
  ): EditorItem | null => {
    if (drawTool === "pen") {
      if (points.length < 2) return null;
      return {
        id: "draft",
        kind: "pen",
        page: pageIndex,
        points,
        color: style.color,
        strokeWidth: style.strokeWidth,
      };
    }
    if (drawTool === "line" || drawTool === "arrow") {
      if (Math.hypot(end.x - start.x, end.y - start.y) < MIN_MARK_SIZE) return null;
      return {
        id: "draft",
        kind: "line",
        page: pageIndex,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        color: style.color,
        strokeWidth: style.strokeWidth,
        arrow: drawTool === "arrow",
      };
    }
    const box = normalizeBox(start, end);
    if (box.w < MIN_MARK_SIZE || box.h < MIN_MARK_SIZE) return null;
    if (drawTool === "redact") return { id: "draft", kind: "redact", page: pageIndex, ...box };
    if (drawTool === "highlight") {
      return { id: "draft", kind: "highlight", page: pageIndex, color: style.color, ...box };
    }
    if (drawTool === "rect" || drawTool === "ellipse") {
      return {
        id: "draft",
        kind: drawTool,
        page: pageIndex,
        color: style.color,
        fill: style.fill,
        strokeWidth: style.strokeWidth,
        ...box,
      };
    }
    return null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    const point = pointFrom(event);
    if (!current || !point || !size) return;
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;

    if (current.type === "draw") {
      if (current.tool === "pen") {
        const last = current.points[current.points.length - 1];
        // Skip jitter finer than a screen pixel.
        if (Math.hypot(point.x - last[0], point.y - last[1]) * pxPerUnit >= 1.5) {
          current.points = [...current.points, [point.x, point.y]];
        }
      }
      setDraft(drawn(current.tool, current.start, point, current.points));
      return;
    }
    if (!current.moved) {
      if (Math.hypot(dx, dy) * pxPerUnit < 3) return;
      current.moved = true;
      editor.begin();
    }

    if (current.type === "move") {
      const original = current.original;
      if (original.kind === "line") {
        const cx = Math.min(Math.max(dx, -Math.min(original.x1, original.x2)), size.width - Math.max(original.x1, original.x2));
        const cy = Math.min(Math.max(dy, -Math.min(original.y1, original.y2)), size.height - Math.max(original.y1, original.y2));
        editor.patch(
          current.id,
          { x1: original.x1 + cx, y1: original.y1 + cy, x2: original.x2 + cx, y2: original.y2 + cy },
          false
        );
      } else if (original.kind === "pen") {
        const box = boundsOf(original);
        const moved = moveBox(box, dx, dy, size);
        const shiftX = moved.x - box.x;
        const shiftY = moved.y - box.y;
        editor.patch(
          current.id,
          { points: original.points.map(([px, py]) => [px + shiftX, py + shiftY] as [number, number]) },
          false
        );
      } else {
        const moved = moveBox(boundsOf(original), dx, dy, size);
        editor.patch(current.id, { x: moved.x, y: moved.y }, false);
      }
    } else if (current.type === "resize") {
      const item = pageItems.find((candidate) => candidate.id === current.id);
      const keepAspect = item?.kind === "image" || item?.kind === "mark" || item?.kind === "step";
      const box = resizeBox(current.original, current.corner, dx, dy, size, { keepAspect });
      editor.patch(current.id, { x: box.x, y: box.y, w: box.w, h: box.h }, false);
    } else if (current.original.kind === "line") {
      const x = Math.min(Math.max((current.end === 1 ? current.original.x1 : current.original.x2) + dx, 0), size.width);
      const y = Math.min(Math.max((current.end === 1 ? current.original.y1 : current.original.y2) + dy, 0), size.height);
      editor.patch(current.id, current.end === 1 ? { x1: x, y1: y } : { x2: x, y2: y }, false);
    }
  };

  const finish = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = gesture.current;
    gesture.current = null;
    setDraft(null);
    if (current?.type !== "draw" || cancelled) return;
    const point = pointFrom(event);
    const item = point && drawn(current.tool, current.start, point, current.points);
    if (item) {
      const id = newId();
      editor.add({ ...item, id } as EditorItem);
      onSelect(id);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    if (event.key === "Escape") {
      onSelect(null);
      onToolChange("select");
      return;
    }
    if (!selected || !size) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      editor.remove(selected.id);
      onSelect(null);
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    if (selected.kind === "line") {
      editor.patch(selected.id, {
        x1: selected.x1 + move[0],
        y1: selected.y1 + move[1],
        x2: selected.x2 + move[0],
        y2: selected.y2 + move[1],
      });
    } else if (selected.kind === "pen") {
      const box = boundsOf(selected);
      const moved = moveBox(box, move[0], move[1], size);
      editor.patch(selected.id, {
        points: selected.points.map(([px, py]) => [px + moved.x - box.x, py + moved.y - box.y] as [number, number]),
      });
    } else {
      const moved = moveBox(boundsOf(selected), move[0], move[1], size);
      editor.patch(selected.id, { x: moved.x, y: moved.y });
    }
  };

  const finishEditing = () => {
    if (editing && !editing.text.trim()) {
      editor.remove(editing.id);
      onSelect(null);
    }
    onEditing(null);
  };

  const percent = (value: number, total: number) => `${(value / total) * 100}%`;
  const drawing = DRAG_TOOLS.includes(tool);
  const cursor = tool === "select" ? "default" : tool === "text" ? "text" : "crosshair";

  if (size === null) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-card text-muted-foreground">
        <FileWarning className="mr-2 size-5" />
        This couldn’t be shown.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/60 p-2 sm:p-4">
      <div
        ref={stage}
        role="group"
        aria-label={ariaLabel}
        tabIndex={0}
        data-markup-stage
        className="bg-checker relative mx-auto w-full touch-none overflow-hidden rounded-md shadow-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{
          maxWidth,
          aspectRatio: size ? `${size.width} / ${size.height}` : "3 / 4",
          cursor,
        }}
        onPointerDown={onPointerDown}
        // Without this the browser moves focus to the page after the new text box has taken it.
        onMouseDown={(event) => {
          if (tool === 'text' && !(event.target instanceof HTMLTextAreaElement)) event.preventDefault();
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event, false)}
        onPointerCancel={(event) => finish(event, true)}
        onKeyDown={onKeyDown}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} draggable={false} className="pointer-events-none absolute inset-0 size-full" />
        ) : (
          <div className="absolute inset-4 animate-pulse rounded bg-muted" />
        )}

        {size && (
          <svg viewBox={`0 0 ${size.width} ${size.height}`} className="absolute inset-0 size-full" aria-hidden>
            {pageItems.map((item) => {
              const bounds = boundsOf(item);
              const isSelected = item.id === selectedId;
              const hidden = editing?.id === item.id;
              return (
                <g key={item.id} data-item={item.id} style={{ visibility: hidden ? "hidden" : undefined }}>
                  <ItemShape item={item} />
                  {item.kind === "line" ? (
                    <line
                      x1={item.x1}
                      y1={item.y1}
                      x2={item.x2}
                      y2={item.y2}
                      stroke="transparent"
                      strokeWidth={Math.max(item.strokeWidth, 12 / pxPerUnit)}
                      style={{ pointerEvents: tool === "select" ? "stroke" : "none" }}
                    />
                  ) : (
                    <rect
                      x={bounds.x}
                      y={bounds.y}
                      width={bounds.w}
                      height={bounds.h}
                      fill="transparent"
                      style={{ pointerEvents: tool === "select" ? "all" : "none" }}
                    />
                  )}
                  {isSelected && !hidden && (
                    <rect
                      x={bounds.x - 1}
                      y={bounds.y - 1}
                      width={bounds.w + 2}
                      height={bounds.h + 2}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
            {draft && <ItemShape item={draft} draft />}
          </svg>
        )}

        {size && selected && !editing && tool === "select" && selected.kind !== "text" && selected.kind !== "pen" && (
          <>
            {selected.kind === "line"
              ? ([1, 2] as const).map((end) => (
                  <Handle
                    key={end}
                    label={`Move the ${end === 1 ? "start" : "end"} of the line`}
                    left={percent(end === 1 ? selected.x1 : selected.x2, size.width)}
                    top={percent(end === 1 ? selected.y1 : selected.y2, size.height)}
                    cursor="move"
                    // The handler runs on pointer events only; it never reads the ref while rendering.
                    // eslint-disable-next-line react-hooks/refs
                    onPointerDown={(event) => startEndpoint(event, selected, end)}
                  />
                ))
              : HANDLE_CORNERS.map((corner) => {
                  const box = boundsOf(selected);
                  return (
                    <Handle
                      key={corner}
                      label={`Resize from the ${{ nw: "top left", ne: "top right", sw: "bottom left", se: "bottom right" }[corner]} corner`}
                      left={percent(corner.includes("w") ? box.x : box.x + box.w, size.width)}
                      top={percent(corner.includes("n") ? box.y : box.y + box.h, size.height)}
                      cursor={corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize"}
                      onPointerDown={(event) => startResize(event, selected, corner)}
                    />
                  );
                })}
          </>
        )}

        {size && editing && (
          <textarea
            autoFocus
            aria-label="Text to add"
            value={editing.text}
            rows={editing.text.split("\n").length}
            spellCheck={false}
            placeholder="Type here"
            className="absolute resize-none overflow-hidden border border-dashed border-primary bg-white/70 p-0 outline-none"
            style={{
              left: percent(editing.x, size.width),
              top: percent(editing.y, size.height),
              fontSize: editing.size * pxPerUnit,
              lineHeight: TEXT_LINE_HEIGHT,
              fontFamily: MARKUP_FONT,
              color: editing.color,
              width: `${Math.max(8, ...editing.text.split("\n").map((line) => line.length + 2))}ch`,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => editor.patch(editing.id, { text: event.target.value }, false)}
            onFocus={() => editor.begin()}
            onBlur={finishEditing}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") event.currentTarget.blur();
            }}
          />
        )}
      </div>
      {drawing && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Drag to draw. Press Esc to stop.</p>
      )}
    </div>
  );
}

function Handle({
  left,
  top,
  cursor,
  label,
  onPointerDown,
}: {
  left: string;
  top: string;
  cursor: string;
  label: string;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <div
      aria-label={label}
      role="presentation"
      className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-sm"
      style={{ left, top, cursor, touchAction: "none" }}
      onPointerDown={onPointerDown}
    />
  );
}
