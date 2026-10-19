/** Getting images ready for the Images to PDF tool: PNG or JPEG bytes, turned upright. */
import exifr from "exifr";

import { MAX_CANVAS_PIXELS } from "@/features/image/lib/canvas";
import { loadImage } from "@/features/image/lib/files";

export type Turn = 0 | 90 | 180 | 270;

const PASS_THROUGH = /^image\/(png|jpeg)$/;

/** True if any pixel is not fully opaque (checked on a downscaled copy). */
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const probe = document.createElement("canvas");
  const scale = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
  probe.width = Math.max(1, Math.round(canvas.width * scale));
  probe.height = Math.max(1, Math.round(canvas.height * scale));
  const context = probe.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(canvas, 0, 0, probe.width, probe.height);
  const { data } = context.getImageData(0, 0, probe.width, probe.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

async function needsRedraw(file: File, turn: Turn): Promise<boolean> {
  if (turn !== 0 || !PASS_THROUGH.test(file.type)) return true;
  if (file.type !== "image/jpeg") return false;
  // A JPEG carries its own "rotate me" flag; viewers honour it but PDF pages don't.
  const orientation = await exifr.orientation(file).catch(() => undefined);
  return orientation !== undefined && orientation !== 1;
}

/**
 * PNG and JPEG files go in as they are (smallest, lossless). Anything else —
 * WebP, GIF, AVIF, a rotated image, a JPEG with an orientation flag — is
 * redrawn: as JPEG when it has no transparency, otherwise PNG.
 */
export async function imageForPdf(file: File, turn: Turn): Promise<Uint8Array> {
  if (!(await needsRedraw(file, turn))) return new Uint8Array(await file.arrayBuffer());

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS) {
      throw new Error(`“${file.name}” is too large to convert in the browser.`);
    }
    const sideways = turn === 90 || turn === 270;
    const canvas = document.createElement("canvas");
    canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
    canvas.height = sideways ? image.naturalWidth : image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn’t create a drawing surface.");
    context.imageSmoothingQuality = "high";
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((turn * Math.PI) / 180);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    const transparent = hasTransparency(canvas);
    if (!transparent) {
      // JPEG has no alpha: flatten onto white in case a stray semi-transparent edge slipped through.
      const flat = document.createElement("canvas");
      flat.width = canvas.width;
      flat.height = canvas.height;
      const flatContext = flat.getContext("2d")!;
      flatContext.fillStyle = "#fff";
      flatContext.fillRect(0, 0, flat.width, flat.height);
      flatContext.drawImage(canvas, 0, 0);
      return blobBytes(flat, "image/jpeg", 0.92, file.name);
    }
    return blobBytes(canvas, "image/png", undefined, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function blobBytes(canvas: HTMLCanvasElement, type: string, quality: number | undefined, name: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error(`“${name}” couldn’t be converted. Try a smaller image.`);
  return new Uint8Array(await blob.arrayBuffer());
}
