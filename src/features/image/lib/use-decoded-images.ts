import { useEffect, useRef, useState } from 'react';

import { MAX_CANVAS_PIXELS } from '@/features/image/lib/canvas';
import { loadImage } from '@/features/image/lib/files';

type Entry = { image: HTMLImageElement | null; error: string | null };

/**
 * Decodes each file once and keeps the pictures by id for canvas drawing.
 * Files that can't be decoded or are too big to edit report an error instead.
 */
export function useDecodedImages(items: { id: string; file: File }[]) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const started = useRef(new Set<string>());

  useEffect(() => {
    for (const { id, file } of items) {
      if (started.current.has(id)) continue;
      started.current.add(id);
      const url = URL.createObjectURL(file);
      loadImage(url).then(
        (image) => {
          const tooLarge = image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS;
          setEntries((all) => ({
            ...all,
            [id]: {
              image: tooLarge ? null : image,
              error: tooLarge ? `“${file.name}” is too large to edit in the browser.` : null,
            },
          }));
        },
        (reason: unknown) =>
          setEntries((all) => ({
            ...all,
            [id]: {
              image: null,
              error: reason instanceof Error ? `“${file.name}”: ${reason.message}` : `“${file.name}” couldn’t be read.`,
            },
          })),
      ).finally(() => URL.revokeObjectURL(url));
    }
  }, [items]);

  const ready = items.every((item) => entries[item.id]);
  const images = new Map<string, HTMLImageElement>();
  const errors: string[] = [];
  for (const item of items) {
    const entry = entries[item.id];
    if (entry?.image) images.set(item.id, entry.image);
    if (entry?.error) errors.push(entry.error);
  }
  return { images, errors, ready };
}
