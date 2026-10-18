/**
 * Lossy-but-invisible size reduction for PDF content streams (the drawing
 * instructions of pages, forms and patterns).
 *
 * Design tools often write coordinates like `245.391375`. Rounding to 0.001pt
 * (1/72000 inch) is far below anything a screen or printer can show, but
 * shortens streams considerably. Small values such as scale factors in `cm`
 * or `Tm` keep at least five significant digits so nothing visibly moves.
 * Runs of whitespace are also collapsed.
 *
 * Strings and hex strings are copied verbatim and comments are dropped.
 * Streams with inline images, or anything unexpected, make the function give
 * up and return null, so the original stream is kept.
 */

const MIN_DECIMALS = 3;
const SIGNIFICANT_DIGITS = 5;

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMITERS = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

function isRegular(byte: number) {
  return !WHITESPACE.has(byte) && !DELIMITERS.has(byte);
}

const NUMBER = /^[+-]?(\d+\.\d*|\.\d+)$/;

/** Rounds a real-number token; integers and non-numbers are returned unchanged. */
export function roundNumberToken(token: string): string {
  if (!NUMBER.test(token)) return token;
  const value = Number(token);
  if (!Number.isFinite(value)) return token;

  const originalDecimals = token.length - token.indexOf(".") - 1;
  const magnitude = Math.abs(value);
  let decimals = MIN_DECIMALS;
  if (magnitude > 0) {
    const exponent = Math.floor(Math.log10(magnitude));
    decimals = Math.max(MIN_DECIMALS, SIGNIFICANT_DIGITS - 1 - exponent);
  }
  decimals = Math.min(decimals, originalDecimals, 20);

  let text = value.toFixed(decimals);
  if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
  if (text === "-0") text = "0";
  text = text.replace(/^(-?)0\./, "$1.");
  return text.length < token.length ? text : token;
}

function skipString(data: Uint8Array, start: number): number {
  let depth = 0;
  for (let i = start; i < data.length; i++) {
    const byte = data[i];
    if (byte === 0x5c) {
      i++; // escaped character
    } else if (byte === 0x28) {
      depth++;
    } else if (byte === 0x29) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

export function optimizeContentStream(data: Uint8Array): Uint8Array | null {
  const out = new Uint8Array(data.length);
  let length = 0;
  let i = 0;

  const copy = (from: number, to: number) => {
    out.set(data.subarray(from, to), length);
    length += to - from;
  };
  const writeText = (text: string) => {
    for (let k = 0; k < text.length; k++) out[length++] = text.charCodeAt(k);
  };

  while (i < data.length) {
    const byte = data[i];

    if (WHITESPACE.has(byte)) {
      let hasNewline = false;
      while (i < data.length && WHITESPACE.has(data[i])) {
        if (data[i] === 0x0a || data[i] === 0x0d) hasNewline = true;
        i++;
      }
      if (length > 0) out[length++] = hasNewline ? 0x0a : 0x20;
      continue;
    }

    if (byte === 0x25) {
      // Comment: drop it, keep the line break that ends it.
      while (i < data.length && data[i] !== 0x0a && data[i] !== 0x0d) i++;
      continue;
    }

    if (byte === 0x28) {
      const end = skipString(data, i);
      if (end === -1) return null;
      copy(i, end);
      i = end;
      continue;
    }

    if (byte === 0x3c && data[i + 1] !== 0x3c) {
      const end = data.indexOf(0x3e, i);
      if (end === -1) return null;
      copy(i, end + 1);
      i = end + 1;
      continue;
    }

    if (!isRegular(byte)) {
      // Delimiters: [ ] { } << >> and the leading slash of a name.
      if (byte === 0x2f) {
        let end = i + 1;
        while (end < data.length && isRegular(data[end])) end++;
        copy(i, end);
        i = end;
      } else {
        out[length++] = byte;
        i++;
      }
      continue;
    }

    let end = i;
    while (end < data.length && isRegular(data[end])) end++;
    let token = "";
    for (let k = i; k < end; k++) token += String.fromCharCode(data[k]);
    i = end;

    // Inline image data is binary and its end can't be found reliably
    // without decoding it, so streams that contain one are left alone.
    if (token === "BI") return null;

    writeText(roundNumberToken(token));
  }

  return out.slice(0, length);
}
