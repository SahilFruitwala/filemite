/**
 * Page range helpers. All page numbers here are 1-based, matching what users
 * see. The engine converts to 0-based indices at its boundary.
 */

export type RangeParseResult =
  | { ok: true; groups: number[][] }
  | { ok: false; error: string };

const TOKEN_SEPARATOR = /[,;]+/;
const LAST_PAGE = /^(z|end|last)$/i;

function parsePageToken(token: string, pageCount: number): number | null {
  if (LAST_PAGE.test(token)) return pageCount;
  if (!/^\d+$/.test(token)) return null;
  return Number(token);
}

/**
 * Parses expressions like `1-3, 5, 8-z` into groups of page numbers, one group
 * per comma-separated token, in the order written. `z`, `end` and `last` mean
 * the final page; open ranges (`8-`, `-3`) run to the end or from the start.
 * A reversed range (`5-1`) yields its pages in descending order.
 */
export function parseRanges(input: string, pageCount: number): RangeParseResult {
  const tokens = input
    .split(TOKEN_SEPARATOR)
    .map((token) => token.replace(/\s+/g, ""))
    .filter(Boolean);

  if (!tokens.length) {
    return { ok: false, error: "Enter at least one page or range." };
  }

  const groups: number[][] = [];

  for (const token of tokens) {
    const dash = token.indexOf("-");
    let start: number | null;
    let end: number | null;

    if (dash === -1) {
      start = end = parsePageToken(token, pageCount);
    } else {
      const left = token.slice(0, dash);
      const right = token.slice(dash + 1);
      start = left ? parsePageToken(left, pageCount) : 1;
      end = right ? parsePageToken(right, pageCount) : pageCount;
    }

    if (start === null || end === null) {
      return { ok: false, error: `“${token}” isn’t a page number or range.` };
    }

    for (const page of [start, end]) {
      if (page < 1 || page > pageCount) {
        return {
          ok: false,
          error: `Page ${page} doesn’t exist — this PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
        };
      }
    }

    const step = start <= end ? 1 : -1;
    const group: number[] = [];
    for (let page = start; page !== end + step; page += step) {
      group.push(page);
    }
    groups.push(group);
  }

  return { ok: true, groups };
}

/** Compresses page numbers into a compact, sorted expression: `1-3, 5, 8-10`. */
export function formatRanges(pages: Iterable<number>): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    let end = start;
    while (sorted[i + 1] === end + 1) {
      end = sorted[++i];
    }
    parts.push(start === end ? String(start) : `${start}-${end}`);
  }

  return parts.join(", ");
}

/** Formats a single group for display and file names, e.g. `1-3` or `5`. */
export function describeGroup(group: number[]): string {
  if (group.length === 1) return String(group[0]);
  const isContiguous = group.every(
    (page, index) => index === 0 || page === group[index - 1] + 1
  );
  return isContiguous
    ? `${group[0]}-${group[group.length - 1]}`
    : formatRanges(group);
}

/** Splits `pageCount` pages into consecutive chunks of `size` pages. */
export function chunkPages(pageCount: number, size: number): number[][] {
  const chunk = Math.max(1, Math.floor(size));
  const groups: number[][] = [];
  for (let start = 1; start <= pageCount; start += chunk) {
    const group: number[] = [];
    for (let page = start; page < start + chunk && page <= pageCount; page++) {
      group.push(page);
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Returns the pages after which a cut falls, if `groups` is a contiguous,
 * in-order partition of every page. Otherwise returns null.
 */
export function groupsToCuts(groups: number[][], pageCount: number): Set<number> | null {
  const cuts = new Set<number>();
  let expected = 1;
  for (const group of groups) {
    for (const page of group) {
      if (page !== expected) return null;
      expected++;
    }
    cuts.add(expected - 1);
  }
  if (expected !== pageCount + 1) return null;
  cuts.delete(pageCount);
  return cuts;
}

/** Builds a contiguous partition of all pages from cut positions. */
export function cutsToGroups(cuts: Set<number>, pageCount: number): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  for (let page = 1; page <= pageCount; page++) {
    current.push(page);
    if (cuts.has(page) || page === pageCount) {
      groups.push(current);
      current = [];
    }
  }
  return groups;
}
