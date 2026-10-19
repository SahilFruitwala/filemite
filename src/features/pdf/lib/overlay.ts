/**
 * Marks drawn on a PDF page by the Sign, Annotate and Redact tools. Kept free
 * of MuPDF imports so the UI and the engine worker share one definition.
 *
 * Coordinates are in points on the page as it is displayed (rotation applied,
 * origin top-left, y down) — the same space the page preview is drawn in.
 */

export type Box = { x: number; y: number; w: number; h: number };

type Shared = { page: number };

export type TextMark = Shared & {
  kind: "text";
  /** Top-left corner of the text block. */
  x: number;
  y: number;
  /** Font size in points. */
  size: number;
  color: string;
  text: string;
};
export type CheckMark = Shared & Box & { kind: "mark"; mark: "check" | "cross"; color: string };
export type ShapeMark = Shared &
  Box & {
    kind: "rect" | "ellipse";
    color: string;
    /** Fill colour, or null for an outline only. */
    fill: string | null;
    strokeWidth: number;
  };
export type HighlightMark = Shared & Box & { kind: "highlight"; color: string };
export type LineMark = Shared & {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  arrow: boolean;
};
export type ImageMark = Shared & Box & { kind: "image"; png: Uint8Array };
/** A freehand stroke through `points`. */
export type PenMark = Shared & {
  kind: "pen";
  points: [number, number][];
  color: string;
  strokeWidth: number;
};
/** A filled circle holding a number; `w` and `h` are its diameter. */
export type StepMark = Shared & Box & { kind: "step"; number: number; color: string };

export type Overlay =
  | TextMark
  | CheckMark
  | ShapeMark
  | HighlightMark
  | LineMark
  | ImageMark
  | PenMark
  | StepMark;

/** Helvetica digit width as a share of the font size, for centring numbers. */
export const DIGIT_WIDTH = 0.556;

/** Size and baseline for the number inside a step marker of the given diameter. */
export function stepText(box: Box, number: number) {
  const size = box.w * (String(number).length > 2 ? 0.42 : String(number).length > 1 ? 0.5 : 0.58);
  const width = String(number).length * DIGIT_WIDTH * size;
  return {
    size,
    x: box.x + box.w / 2 - width / 2,
    // Digits are about 72% of the font size tall; the baseline sits half of that below the middle.
    baseline: box.y + box.h / 2 + size * 0.36,
  };
}

export type RedactBox = Shared & Box;

/** Line height and first-baseline position as multiples of the font size. */
export const TEXT_LINE_HEIGHT = 1.2;
export const TEXT_BASELINE = 0.95;

const HEX = /^#([0-9a-f]{6})$/i;

/** "#rrggbb" to PDF colour components (0–1). Anything else becomes black. */
export function hexToRgb(color: string): [number, number, number] {
  const match = HEX.exec(color);
  if (!match) return [0, 0, 0];
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((part) => part / 255) as [
    number,
    number,
    number,
  ];
}

/** Windows-1252 code points above 0x7F that differ from Latin-1. */
const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/**
 * Encodes a line of text for a standard Latin PDF font. Characters the font
 * can't show become "?"; `lost` reports whether any did.
 */
export function encodeLatin(text: string): { bytes: number[]; lost: boolean } {
  const bytes: number[] = [];
  let lost = false;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code === 0x09) bytes.push(0x20);
    else if (code >= 0x20 && code <= 0x7e) bytes.push(code);
    else if (code >= 0xa0 && code <= 0xff) bytes.push(code);
    else if (CP1252[code] !== undefined) bytes.push(CP1252[code]);
    else {
      bytes.push(0x3f);
      lost = true;
    }
  }
  return { bytes, lost };
}

/** True when `text` has characters the built-in PDF font can't draw. */
export function hasUnsupportedCharacters(text: string): boolean {
  return text.split("\n").some((line) => encodeLatin(line).lost);
}

export function normalizeBox(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

/** Keeps a box inside a page of `width` × `height` points. */
export function clampBox(box: Box, width: number, height: number): Box {
  const w = Math.min(box.w, width);
  const h = Math.min(box.h, height);
  return {
    x: Math.min(Math.max(0, box.x), width - w),
    y: Math.min(Math.max(0, box.y), height - h),
    w,
    h,
  };
}

/**
 * Where an arrow's shaft ends and its three head points sit. The shaft stops
 * inside the head so the tip stays sharp. Shared by the preview and the engine.
 */
export function arrowGeometry(x1: number, y1: number, x2: number, y2: number, strokeWidth: number) {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const head = Math.min(length * 0.6, Math.max(8, strokeWidth * 4.5));
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const half = head * 0.45;
  const baseX = x2 - ux * head;
  const baseY = y2 - uy * head;
  return {
    shaftEnd: [x2 - ux * head * 0.8, y2 - uy * head * 0.8] as const,
    head: [
      [x2, y2],
      [baseX - uy * half, baseY + ux * half],
      [baseX + uy * half, baseY - ux * half],
    ] as const,
  };
}
