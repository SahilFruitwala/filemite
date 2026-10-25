import { describe, expect, test } from 'vitest';
import { suggestForResults, type CompressResult } from './compress-suggestion';

const result = (id: string, saved: number, outputType: string): CompressResult => ({
  id,
  originalSize: 1000,
  outputSize: 1000 - saved * 1000,
  outputType,
});

describe('suggestForResults', () => {
  test('nothing to suggest when every image shrank well', () => {
    expect(suggestForResults([result('a', 0.5, 'image/png'), result('b', 0.1, 'image/jpeg')], 'mid')).toBeNull();
  });

  test('offers WebP and JPEG for PNGs that barely shrank, naming only those images', () => {
    expect(
      suggestForResults([result('a', 0.02, 'image/png'), result('b', 0.6, 'image/png')], 'mid'),
    ).toEqual({ kind: 'format', ids: ['a'], formats: ['webp', 'jpeg'] });
  });

  test('counts files that grew', () => {
    expect(suggestForResults([result('a', -0.3, 'image/png')], 'best')).toMatchObject({ ids: ['a'] });
  });

  test('offers only WebP when the output is already JPEG', () => {
    expect(suggestForResults([result('a', 0.01, 'image/jpeg')], 'mid')).toMatchObject({
      kind: 'format',
      formats: ['webp'],
    });
  });

  test('offers a lower quality once the output is WebP, and nothing at Smallest', () => {
    expect(suggestForResults([result('a', 0.05, 'image/webp')], 'mid')).toEqual({ kind: 'level', ids: ['a'] });
    expect(suggestForResults([result('a', 0.05, 'image/webp')], 'low')).toBeNull();
  });
});
