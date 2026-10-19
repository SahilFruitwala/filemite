/** Marks as the page editor holds them: engine overlays plus an id, and redaction boxes. */
import type { Overlay, RedactBox } from "./overlay";

type WithId<T> = T extends unknown ? T & { id: string } : never;

/** A box that will be permanently removed from the page. */
export type RedactItem = RedactBox & { kind: "redact" };

export type EditorItem = WithId<(Overlay & { url?: string }) | RedactItem>;

export type EditorTool =
  | "select"
  | "text"
  | "check"
  | "cross"
  | "rect"
  | "ellipse"
  | "highlight"
  | "line"
  | "arrow"
  | "pen"
  | "step"
  | "redact";

/** What each tool does to the page, for labels and hints. */
export const DRAG_TOOLS: EditorTool[] = [
  "rect",
  "ellipse",
  "highlight",
  "line",
  "arrow",
  "pen",
  "redact",
];

export function toOverlays(items: EditorItem[]): Overlay[] {
  return items.flatMap((item): Overlay[] => {
    if (item.kind === "redact") return [];
    const { id: _id, ...rest } = item;
    void _id;
    if (rest.kind === "image") {
      const { url: _url, ...image } = rest;
      void _url;
      return [image];
    }
    return [rest as Overlay];
  });
}

export function toRedactBoxes(items: EditorItem[]): RedactBox[] {
  return items.flatMap((item) =>
    item.kind === "redact" ? [{ page: item.page, x: item.x, y: item.y, w: item.w, h: item.h }] : []
  );
}

export function countOnPage(items: EditorItem[], page: number): number {
  return items.reduce((total, item) => total + (item.page === page ? 1 : 0), 0);
}

export function newId(): string {
  return crypto.randomUUID();
}
