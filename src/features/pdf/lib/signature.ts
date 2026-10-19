/** Pixel helpers for building a signature image. Kept free of the DOM so they can be tested. */

/** Smallest rectangle containing every pixel with some opacity, or null for an empty image. */
export function contentBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 8
): { x: number; y: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Turns a photo or scan of a signature on white paper into ink on a
 * transparent background: the darker a pixel, the more opaque it becomes,
 * and its colour is set to `ink`. Edits `rgba` in place.
 */
export function inkFromPaper(rgba: Uint8ClampedArray, ink: [number, number, number]) {
  // Paper is rarely pure white; treat the brightest 10% of the range as background.
  const paperLevel = 235;
  const floor = 90;
  for (let i = 0; i < rgba.length; i += 4) {
    const brightness = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    const existing = rgba[i + 3];
    const strength = Math.min(1, Math.max(0, (paperLevel - brightness) / (paperLevel - floor)));
    rgba[i] = ink[0];
    rgba[i + 1] = ink[1];
    rgba[i + 2] = ink[2];
    rgba[i + 3] = Math.round(strength * existing);
  }
}

export const SIGNATURE_INKS: { label: string; value: string }[] = [
  { label: "Black", value: "#111111" },
  { label: "Blue", value: "#1d3fb8" },
  { label: "Dark red", value: "#a3171d" },
];

export const SIGNATURE_FONTS: { label: string; family: string; load: () => Promise<unknown> }[] = [
  {
    label: "Dancing Script",
    family: '"Dancing Script"',
    load: () => import("@fontsource/dancing-script/latin-500.css"),
  },
  { label: "Caveat", family: "Caveat", load: () => import("@fontsource/caveat/latin-500.css") },
  {
    label: "Homemade Apple",
    family: '"Homemade Apple"',
    load: () => import("@fontsource/homemade-apple/latin-400.css"),
  },
];
