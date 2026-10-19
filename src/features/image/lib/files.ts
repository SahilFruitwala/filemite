import { useEffect, useState } from "react";

import { formatBytes } from "@/lib/format";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_BROWSER_IMAGE_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/limits";

export { ACCEPTED_IMAGE_TYPES };

/** Formats a browser can decode itself (no HEIC) — for tools that never upload. */
export const BROWSER_IMAGE_TYPES =
  "image/png,image/jpeg,image/webp,image/gif,image/avif";

export const SERVER_IMAGE_HINT = `PNG, JPEG, WebP, HEIC · up to ${formatBytes(MAX_IMAGE_BYTES)}`;
export const LARGE_IMAGE_HINT = `PNG, JPEG, WebP, HEIC · up to ${formatBytes(MAX_BROWSER_IMAGE_BYTES)} (HEIC over ${formatBytes(MAX_IMAGE_BYTES)} isn’t supported)`;
export const BROWSER_IMAGE_HINT = "PNG, JPEG, WebP, GIF, AVIF";

const SERVER_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
const BROWSER_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const HEIC = /hei[cf]/i;

/** True for files too big to upload; the compress tool handles these in the browser. */
export function isLargeImage(file: File) {
  return file.size > MAX_IMAGE_BYTES;
}

/**
 * Returns why a file can't be used, or null when it's fine. `large` accepts
 * files over the upload limit for tools that can fall back to the browser.
 */
export function imageProblem(
  file: File,
  target: "server" | "browser",
  { large = false }: { large?: boolean } = {},
): string | null {
  const pattern = target === "server" ? SERVER_EXT : BROWSER_EXT;
  const typeOk =
    target === "server"
      ? /^image\/(png|jpe?g|webp|heic|heif)$/.test(file.type)
      : /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type);
  if (!typeOk && !pattern.test(file.name)) {
    return `“${file.name}” isn’t a supported image.`;
  }
  if (target === "server" && large) {
    if (file.size > MAX_BROWSER_IMAGE_BYTES) {
      return `“${file.name}” is over ${formatBytes(MAX_BROWSER_IMAGE_BYTES)}.`;
    }
    if (isLargeImage(file) && HEIC.test(`${file.type} ${file.name}`)) {
      return `“${file.name}” is a HEIC over ${formatBytes(MAX_IMAGE_BYTES)}; convert it to JPEG first.`;
    }
  } else if (target === "server" && file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is over ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}

/** Splits files into usable ones and a combined message for the rest. */
export function partitionImages(
  files: File[],
  target: "server" | "browser",
  options?: { large?: boolean },
) {
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const problem = imageProblem(file, target, options);
    if (problem) problems.push(problem);
    else accepted.push(file);
  }
  return { accepted, notice: problems.length ? problems.join(" ") : null };
}

export function stem(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "image";
}

export function extensionFor(mime: string) {
  const subtype = mime.split("/")[1] ?? "png";
  return subtype === "jpeg" ? "jpg" : subtype.replace("x-icon", "ico");
}

/** Object URL for a blob, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [state, setState] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // Object URLs are an external resource: create and revoke them alongside the blob.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return blob && state?.blob === blob ? state.url : null;
}

/** Natural pixel size of an image URL (null while loading or on error). */
export function useImageSize(url: string | null) {
  const [size, setSize] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () =>
      setSize({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);
  return size && size.url === url
    ? { width: size.width, height: size.height }
    : null;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("This image couldn’t be decoded by your browser."));
    img.src = url;
  });
}
