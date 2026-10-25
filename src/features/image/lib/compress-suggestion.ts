/**
 * When compression barely helps (already-optimised files, screenshots saved as
 * PNG), a different format or a lower quality usually does. Decides what to offer.
 */

/** Results that saved less than this share of the original count as "barely smaller". */
export const LOW_SAVINGS = 0.1;

export type CompressResult = { id: string; originalSize: number; outputSize: number; outputType: string };

export type CompressSuggestion =
  | { kind: 'format'; ids: string[]; formats: ('webp' | 'jpeg')[] }
  | { kind: 'level'; ids: string[] };

export function suggestForResults(
  results: CompressResult[],
  level: 'best' | 'mid' | 'low',
): CompressSuggestion | null {
  const barely = results.filter(
    (result) => result.outputSize > (1 - LOW_SAVINGS) * result.originalSize,
  );
  if (!barely.length) return null;
  const ids = barely.map((result) => result.id);

  if (barely.some((result) => result.outputType !== 'image/webp')) {
    // WebP first: it's usually smallest and keeps transparency. JPEG only if some aren't JPEG already.
    const jpeg = barely.some((result) => result.outputType !== 'image/jpeg');
    return { kind: 'format', ids, formats: jpeg ? ['webp', 'jpeg'] : ['webp'] };
  }

  // Already WebP: only a lower quality is left to try.
  return level === 'low' ? null : { kind: 'level', ids };
}
