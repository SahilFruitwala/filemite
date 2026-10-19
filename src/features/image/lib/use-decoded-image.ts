import { useEffect, useState } from 'react';

import { loadImage } from '@/features/image/lib/files';
import { MAX_CANVAS_PIXELS } from '@/features/image/lib/canvas';

type Decoded = { url: string; image: HTMLImageElement | null; error: string | null };

/**
 * Decodes an object URL once and keeps the result for canvas drawing. Reports
 * a readable error for images the browser can't decode or that are too large to edit.
 */
export function useDecodedImage(url: string | null) {
  const [state, setState] = useState<Decoded | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loadImage(url).then(
      (image) => {
        if (cancelled) return;
        const tooLarge = image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS;
        setState({
          url,
          image: tooLarge ? null : image,
          error: tooLarge
            ? `This image is too large to edit in the browser (over ${Math.round(MAX_CANVAS_PIXELS / 1e6)} megapixels).`
            : null,
        });
      },
      (reason: unknown) => {
        if (cancelled) return;
        setState({
          url,
          image: null,
          error: reason instanceof Error ? reason.message : 'Couldn’t read this image.',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  const current = state && state.url === url ? state : null;
  return {
    image: current?.image ?? null,
    error: current?.error ?? null,
    loading: !!url && !current,
  };
}
