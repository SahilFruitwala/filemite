import { describe, expect, test } from 'vitest';
import {
  chunkPages,
  cutsToGroups,
  describeGroup,
  formatRanges,
  groupsToCuts,
  parseRanges,
} from './page-ranges';

const groups = (input: string, pages = 10) => {
  const result = parseRanges(input, pages);
  if (!result.ok) throw new Error(result.error);
  return result.groups;
};

describe('parseRanges', () => {
  test('parses pages, ranges and keywords in the order written', () => {
    expect(groups('1-3, 5, 8-z')).toEqual([[1, 2, 3], [5], [8, 9, 10]]);
    expect(groups('end; last')).toEqual([[10], [10]]);
  });

  test('supports open ranges and reversed ranges', () => {
    expect(groups('8-')).toEqual([[8, 9, 10]]);
    expect(groups('-3')).toEqual([[1, 2, 3]]);
    expect(groups('3-1')).toEqual([[3, 2, 1]]);
  });

  test('ignores whitespace and empty tokens', () => {
    expect(groups(' 1 - 2 ,, 4 ')).toEqual([[1, 2], [4]]);
  });

  test.each([
    ['', 'at least one'],
    ['  ,  ', 'at least one'],
    ['abc', 'isn’t a page number'],
    ['1-x', 'isn’t a page number'],
    ['0', 'doesn’t exist'],
    ['11', 'doesn’t exist'],
    ['5-99', 'doesn’t exist'],
  ])('rejects %j', (input, message) => {
    const result = parseRanges(input, 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  test('pluralises the page count in errors', () => {
    const result = parseRanges('2', 1);
    expect(result.ok === false && result.error).toContain('1 page.');
  });
});

describe('formatRanges / describeGroup', () => {
  test('collapses runs, sorts and de-duplicates', () => {
    expect(formatRanges([5, 1, 2, 3, 8, 9, 9, 10])).toBe('1-3, 5, 8-10');
    expect(formatRanges([])).toBe('');
  });

  test('describes contiguous and scattered groups', () => {
    expect(describeGroup([4])).toBe('4');
    expect(describeGroup([2, 3, 4])).toBe('2-4');
    expect(describeGroup([1, 3, 4])).toBe('1, 3-4');
  });
});

describe('chunkPages', () => {
  test('splits into fixed-size chunks with a short tail', () => {
    expect(chunkPages(5, 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('treats sizes below 1 as 1', () => {
    expect(chunkPages(2, 0)).toEqual([[1], [2]]);
    expect(chunkPages(2, -3)).toEqual([[1], [2]]);
  });
});

describe('cuts and groups', () => {
  test('cutsToGroups and groupsToCuts are inverses', () => {
    const cuts = new Set([2, 5]);
    const result = cutsToGroups(cuts, 7);
    expect(result).toEqual([[1, 2], [3, 4, 5], [6, 7]]);
    expect(groupsToCuts(result, 7)).toEqual(cuts);
  });

  test('groupsToCuts returns null unless groups partition every page in order', () => {
    expect(groupsToCuts([[1, 2], [4]], 4)).toBeNull();
    expect(groupsToCuts([[2], [1]], 2)).toBeNull();
    expect(groupsToCuts([[1, 2]], 3)).toBeNull();
  });

  test('a single group means no cuts', () => {
    expect(groupsToCuts([[1, 2, 3]], 3)).toEqual(new Set());
  });
});
