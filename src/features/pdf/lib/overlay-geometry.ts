/** Moving and resizing marks on a page. Pure maths, in page points. */
import type { Box } from "./overlay";

export type Corner = "nw" | "ne" | "sw" | "se";
export type PageSize = { width: number; height: number };

export const MIN_MARK_SIZE = 6;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/** Moves a box by (dx, dy) without letting any part of it leave the page. */
export function moveBox(box: Box, dx: number, dy: number, page: PageSize): Box {
  return {
    ...box,
    x: clamp(box.x + dx, 0, Math.max(0, page.width - box.w)),
    y: clamp(box.y + dy, 0, Math.max(0, page.height - box.h)),
  };
}

/**
 * Drags one corner of a box by (dx, dy). The opposite corner stays put.
 * With `keepAspect` the box keeps its proportions, following the horizontal drag.
 */
export function resizeBox(
  box: Box,
  corner: Corner,
  dx: number,
  dy: number,
  page: PageSize,
  { keepAspect = false, min = MIN_MARK_SIZE }: { keepAspect?: boolean; min?: number } = {}
): Box {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  // The edges that stay fixed.
  const anchorX = west ? box.x + box.w : box.x;
  const anchorY = north ? box.y + box.h : box.y;

  const dragX = clamp((west ? box.x : box.x + box.w) + dx, 0, page.width);
  const dragY = clamp((north ? box.y : box.y + box.h) + dy, 0, page.height);
  // Dragging past the fixed corner flips the box to the other side of it.
  const left = dragX < anchorX;
  const up = dragY < anchorY;

  let width = Math.max(min, Math.abs(dragX - anchorX));
  let height = Math.max(min, Math.abs(dragY - anchorY));

  if (keepAspect && box.w > 0 && box.h > 0) {
    const room = {
      width: left ? anchorX : page.width - anchorX,
      height: up ? anchorY : page.height - anchorY,
    };
    const ratio = box.w / box.h;
    width = Math.max(min, Math.min(width, room.width, room.height * ratio));
    height = width / ratio;
  }

  const movingX = left ? anchorX - width : anchorX + width;
  const movingY = up ? anchorY - height : anchorY + height;
  return {
    x: Math.min(anchorX, movingX),
    y: Math.min(anchorY, movingY),
    w: width,
    h: height,
  };
}

/** A square of `size` points centred on a point, kept inside the page. */
export function centeredBox(
  point: { x: number; y: number },
  width: number,
  height: number,
  page: PageSize
): Box {
  return {
    w: width,
    h: height,
    x: clamp(point.x - width / 2, 0, Math.max(0, page.width - width)),
    y: clamp(point.y - height / 2, 0, Math.max(0, page.height - height)),
  };
}

/** Points where a pointer at (clientX, clientY) lands on a page drawn into `rect`. */
export function toPagePoint(
  client: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  page: PageSize
) {
  return {
    x: clamp(((client.x - rect.left) / rect.width) * page.width, 0, page.width),
    y: clamp(((client.y - rect.top) / rect.height) * page.height, 0, page.height),
  };
}
