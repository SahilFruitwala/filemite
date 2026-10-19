/**
 * Compresses an image in the browser. Used for files over the upload limit,
 * where the server can't be reached; output is a little larger than Sharp's.
 */
import {
  MAX_CANVAS_PIXELS,
  canvasToBlob,
  createCanvas,
  outputMime,
  paintBackground,
  type OutputMime,
} from "@/features/image/lib/canvas";
import { loadImage } from "@/features/image/lib/files";

/** Same numbers and longest edge as /api/image/compress. */
const QUALITY = { best: 0.9, mid: 0.75, low: 0.4 } as const;
const MAX_WIDTH = 1920;

export type BrowserCompressOptions = {
  level: keyof typeof QUALITY;
  /** Output type; omit to keep the original's. */
  format?: "jpeg" | "png" | "webp";
};

export async function compressInBrowser(
  file: File,
  options: BrowserCompressOptions,
) {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS) {
      throw new Error(
        `Too large to process in the browser (over ${Math.round(MAX_CANVAS_PIXELS / 1e6)} megapixels).`,
      );
    }

    const mime: OutputMime = options.format
      ? `image/${options.format}`
      : outputMime(file.type);
    const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
    const size = {
      width: Math.max(1, Math.round(image.naturalWidth * scale)),
      height: Math.max(1, Math.round(image.naturalHeight * scale)),
    };
    const { canvas, context } = createCanvas(size.width, size.height);
    paintBackground(context, mime);
    context.drawImage(image, 0, 0, size.width, size.height);
    return await canvasToBlob(canvas, mime, QUALITY[options.level]);
  } finally {
    URL.revokeObjectURL(url);
  }
}
