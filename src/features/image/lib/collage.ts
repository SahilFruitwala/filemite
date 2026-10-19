/** Cell layouts for the Collage Maker. All rectangles are in output pixels. */

export type CollageLayout = 'grid' | 'row' | 'column' | 'feature';

export type Cell = { x: number; y: number; width: number; height: number };

export const COLLAGE_ASPECTS: { id: string; label: string; ratio: number }[] = [
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

/** Columns that make the cells close to square for a canvas of this shape. */
export function defaultColumns(count: number, aspect: number): number {
  return Math.min(count, Math.max(1, Math.round(Math.sqrt(count * aspect))));
}

/** Splits `length` into `parts` equal pieces separated by `gap`; the pieces use every pixel. */
function split(start: number, length: number, parts: number, gap: number): [number, number][] {
  const usable = length - gap * (parts - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < parts; i++) {
    const from = start + Math.round((usable * i) / parts) + gap * i;
    const to = start + Math.round((usable * (i + 1)) / parts) + gap * i;
    result.push([from, to - from]);
  }
  return result;
}

export function collageCells(
  layout: CollageLayout,
  count: number,
  width: number,
  height: number,
  gap: number,
  columns?: number,
): Cell[] {
  if (count < 1) return [];
  const inner = { x: gap, y: gap, width: width - gap * 2, height: height - gap * 2 };

  if (layout === 'row' || layout === 'column') {
    const parts = split(layout === 'row' ? inner.x : inner.y, layout === 'row' ? inner.width : inner.height, count, gap);
    return parts.map(([start, length]) =>
      layout === 'row'
        ? { x: start, y: inner.y, width: length, height: inner.height }
        : { x: inner.x, y: start, width: inner.width, height: length },
    );
  }

  if (layout === 'feature' && count > 1) {
    const [[leftX, leftW], [rightX, rightW]] = [
      [inner.x, Math.round((inner.width - gap) * 0.6)],
      [inner.x + Math.round((inner.width - gap) * 0.6) + gap, inner.width - Math.round((inner.width - gap) * 0.6) - gap],
    ];
    const rows = split(inner.y, inner.height, count - 1, gap);
    return [
      { x: leftX, y: inner.y, width: leftW, height: inner.height },
      ...rows.map(([y, h]) => ({ x: rightX, y, width: rightW, height: h })),
    ];
  }

  // Grid: the last row stretches to fill the width, so there are no holes.
  const cols = Math.min(count, Math.max(1, columns ?? defaultColumns(count, width / height)));
  const rowCount = Math.ceil(count / cols);
  const rowSlots = split(inner.y, inner.height, rowCount, gap);
  const cells: Cell[] = [];
  rowSlots.forEach(([y, h], row) => {
    const inRow = Math.min(cols, count - row * cols);
    split(inner.x, inner.width, inRow, gap).forEach(([x, w]) => cells.push({ x, y, width: w, height: h }));
  });
  return cells;
}

/** The part of an image to draw into a cell: the whole picture (`fit`) or a centred crop that fills it (`fill`). */
export function coverSource(
  imageWidth: number,
  imageHeight: number,
  cell: Cell,
  mode: 'fill' | 'fit',
): { sx: number; sy: number; sWidth: number; sHeight: number; dx: number; dy: number; dWidth: number; dHeight: number } {
  if (mode === 'fit') {
    const scale = Math.min(cell.width / imageWidth, cell.height / imageHeight);
    const dWidth = imageWidth * scale;
    const dHeight = imageHeight * scale;
    return {
      sx: 0,
      sy: 0,
      sWidth: imageWidth,
      sHeight: imageHeight,
      dx: cell.x + (cell.width - dWidth) / 2,
      dy: cell.y + (cell.height - dHeight) / 2,
      dWidth,
      dHeight,
    };
  }
  const scale = Math.max(cell.width / imageWidth, cell.height / imageHeight);
  const sWidth = cell.width / scale;
  const sHeight = cell.height / scale;
  return {
    sx: (imageWidth - sWidth) / 2,
    sy: (imageHeight - sHeight) / 2,
    sWidth,
    sHeight,
    dx: cell.x,
    dy: cell.y,
    dWidth: cell.width,
    dHeight: cell.height,
  };
}
