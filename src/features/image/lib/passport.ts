/** Photo sizes and print-sheet layout for the Passport Photo Maker. */

export const DPI = 300;

export type PhotoSize = { id: string; label: string; widthMm: number; heightMm: number };

export const PHOTO_SIZES: PhotoSize[] = [
  { id: 'us', label: 'United States — 2×2 in', widthMm: 50.8, heightMm: 50.8 },
  { id: 'eu', label: 'Schengen / EU — 35×45 mm', widthMm: 35, heightMm: 45 },
  { id: 'uk', label: 'United Kingdom — 35×45 mm', widthMm: 35, heightMm: 45 },
  { id: 'in', label: 'India — 35×45 mm', widthMm: 35, heightMm: 45 },
  { id: 'ca', label: 'Canada — 50×70 mm', widthMm: 50, heightMm: 70 },
  { id: 'au', label: 'Australia — 35×45 mm', widthMm: 35, heightMm: 45 },
  { id: 'cn', label: 'China visa — 33×48 mm', widthMm: 33, heightMm: 48 },
  { id: 'jp', label: 'Japan — 35×45 mm', widthMm: 35, heightMm: 45 },
  { id: 'custom', label: 'Custom size', widthMm: 35, heightMm: 45 },
];

export type Sheet = { id: string; label: string; widthMm: number; heightMm: number };

export const SHEETS: Sheet[] = [
  { id: 'single', label: 'Single photo', widthMm: 0, heightMm: 0 },
  { id: '4x6', label: '4×6 in sheet', widthMm: 101.6, heightMm: 152.4 },
  { id: '5x7', label: '5×7 in sheet', widthMm: 127, heightMm: 177.8 },
  { id: 'a4', label: 'A4 sheet', widthMm: 210, heightMm: 297 },
];

export const MIN_MM = 15;
export const MAX_MM = 120;

export const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);

export type SheetLayout = {
  /** Sheet size in pixels, after any turn to landscape. */
  width: number;
  height: number;
  photoWidth: number;
  photoHeight: number;
  positions: { x: number; y: number }[];
};

/**
 * Packs as many photos as fit on a sheet, trying both orientations and
 * keeping the one that holds more. The block of photos is centred.
 */
export function sheetLayout(
  sheet: { widthMm: number; heightMm: number },
  photo: { widthMm: number; heightMm: number },
  { gapMm = 2, marginMm = 3 }: { gapMm?: number; marginMm?: number } = {},
): SheetLayout {
  const photoWidth = mmToPx(photo.widthMm);
  const photoHeight = mmToPx(photo.heightMm);
  const gap = mmToPx(gapMm);
  const margin = mmToPx(marginMm);

  const attempt = (sheetWidth: number, sheetHeight: number): SheetLayout => {
    const cols = Math.max(0, Math.floor((sheetWidth - margin * 2 + gap) / (photoWidth + gap)));
    const rows = Math.max(0, Math.floor((sheetHeight - margin * 2 + gap) / (photoHeight + gap)));
    const blockWidth = cols * photoWidth + Math.max(0, cols - 1) * gap;
    const blockHeight = rows * photoHeight + Math.max(0, rows - 1) * gap;
    const left = Math.round((sheetWidth - blockWidth) / 2);
    const top = Math.round((sheetHeight - blockHeight) / 2);
    const positions: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        positions.push({ x: left + col * (photoWidth + gap), y: top + row * (photoHeight + gap) });
      }
    }
    return { width: sheetWidth, height: sheetHeight, photoWidth, photoHeight, positions };
  };

  const portrait = attempt(mmToPx(sheet.widthMm), mmToPx(sheet.heightMm));
  const landscape = attempt(mmToPx(sheet.heightMm), mmToPx(sheet.widthMm));
  return landscape.positions.length > portrait.positions.length ? landscape : portrait;
}

/**
 * Where to draw the picture inside a frame. `zoom` 1 just covers the frame;
 * offsets are fractions of the frame size, so the same framing works at any resolution.
 */
export function photoPlacement(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom;
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: (frameWidth - width) / 2 + offsetX * frameWidth,
    y: (frameHeight - height) / 2 + offsetY * frameHeight,
    width,
    height,
  };
}
