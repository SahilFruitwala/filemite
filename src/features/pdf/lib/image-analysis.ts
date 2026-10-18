/**
 * Pixel-level helpers for choosing and producing the best encoding of an
 * image. Everything here works on plain byte arrays (interleaved RGB or gray,
 * no alpha) so it can be unit-tested without MuPDF.
 */

// ---------------------------------------------------------------------------
// Colour statistics
// ---------------------------------------------------------------------------

/** Above this many distinct colours an image is treated as a photo. */
export const MAX_GRAPHIC_COLORS = 65_536;

export type ColorHistogram = {
  /** Packed colour values (0xRRGGBB, or 0xGG for gray). */
  colors: Uint32Array;
  counts: Uint32Array;
};

/**
 * Counts distinct colours with an open-addressing hash table. Returns null as
 * soon as the image has more than `MAX_GRAPHIC_COLORS` — photos bail out fast.
 */
export function colorHistogram(pixels: Uint8Array, channels: 1 | 3): ColorHistogram | null {
  const size = 1 << 18;
  const mask = size - 1;
  const keys = new Int32Array(size).fill(-1);
  const counts = new Uint32Array(size);
  let distinct = 0;

  for (let i = 0; i < pixels.length; i += channels) {
    const color =
      channels === 3 ? (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2] : pixels[i];
    let slot = Math.imul(color, 0x9e3779b1) >>> 14 & mask;
    while (keys[slot] !== -1 && keys[slot] !== color) slot = (slot + 1) & mask;
    if (keys[slot] === -1) {
      if (++distinct > MAX_GRAPHIC_COLORS) return null;
      keys[slot] = color;
    }
    counts[slot]++;
  }

  const outColors = new Uint32Array(distinct);
  const outCounts = new Uint32Array(distinct);
  for (let slot = 0, k = 0; slot < size; slot++) {
    if (keys[slot] !== -1) {
      outColors[k] = keys[slot];
      outCounts[k++] = counts[slot];
    }
  }
  return { colors: outColors, counts: outCounts };
}

/**
 * Share of pixels covered by the `n` most common colours. Flat graphics
 * (charts, logos, screenshots) are dominated by a few colours (≈0.9+);
 * photos and scans are not (≈0.05–0.5), even in grayscale.
 */
export function topColorCoverage(histogram: ColorHistogram, n: number): number {
  const counts = [...histogram.counts].sort((a, b) => b - a);
  let covered = 0;
  let total = 0;
  for (let i = 0; i < counts.length; i++) {
    total += counts[i];
    if (i < n) covered += counts[i];
  }
  return total ? covered / total : 0;
}

// ---------------------------------------------------------------------------
// Palette quantization
// ---------------------------------------------------------------------------

export type Palette = {
  /** Interleaved palette entries (RGB or gray), at most 256 of them. */
  entries: Uint8Array;
  size: number;
  /** One palette index per pixel. */
  indices: Uint8Array;
  /** Peak signal-to-noise ratio of the result in dB (Infinity if exact). */
  psnr: number;
};

function unpack(color: number, channels: 1 | 3, out: number[]) {
  if (channels === 3) {
    out[0] = (color >> 16) & 255;
    out[1] = (color >> 8) & 255;
    out[2] = color & 255;
  } else {
    out[0] = color;
  }
}

/**
 * Reduces an image to at most 256 colours: median cut over the colour
 * histogram, refined with a few weighted k-means passes. Work scales with the
 * number of distinct colours, not pixels, so it's fast on graphics.
 */
export function buildPalette(
  pixels: Uint8Array,
  channels: 1 | 3,
  histogram: ColorHistogram
): Palette {
  const { colors, counts } = histogram;
  const n = colors.length;
  const values = new Float64Array(n * channels);
  const tmp = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    unpack(colors[i], channels, tmp);
    for (let c = 0; c < channels; c++) values[i * channels + c] = tmp[c];
  }

  let centroids: Float64Array;
  if (n <= 256) {
    centroids = values.slice();
  } else {
    // Variance-based median cut: repeatedly split the box with the largest
    // weighted squared error, at its weighted mean along its widest axis.
    // (Splitting at the weighted median wastes splits peeling single shades
    // off a dominant colour such as a white background.)
    type Box = { members: number[]; score: number; axis: number; mean: number };
    const describe = (members: number[]): Box => {
      let weight = 0;
      const sum = [0, 0, 0];
      for (const m of members) {
        weight += counts[m];
        for (let c = 0; c < channels; c++) sum[c] += values[m * channels + c] * counts[m];
      }
      let error = 0;
      let axis = 0;
      let axisError = -1;
      for (let c = 0; c < channels; c++) {
        const mean = sum[c] / weight;
        let channelError = 0;
        for (const m of members) channelError += counts[m] * (values[m * channels + c] - mean) ** 2;
        error += channelError;
        if (channelError > axisError) {
          axisError = channelError;
          axis = c;
        }
      }
      return {
        members,
        axis,
        mean: sum[axis] / weight,
        score: members.length > 1 && error > 0 ? error : -1,
      };
    };
    const boxes: Box[] = [describe(Array.from({ length: n }, (_, i) => i))];
    while (boxes.length < 256) {
      let pick = 0;
      for (let b = 1; b < boxes.length; b++) if (boxes[b].score > boxes[pick].score) pick = b;
      const box = boxes[pick];
      if (box.score <= 0) break;
      const sorted = box.members.sort(
        (a, b) => values[a * channels + box.axis] - values[b * channels + box.axis]
      );
      let cut = sorted.findIndex((m) => values[m * channels + box.axis] > box.mean);
      cut = Math.min(sorted.length - 1, Math.max(1, cut === -1 ? sorted.length - 1 : cut));
      boxes.splice(pick, 1, describe(sorted.slice(0, cut)), describe(sorted.slice(cut)));
    }
    centroids = new Float64Array(boxes.length * channels);
    boxes.forEach((box, b) => {
      let weight = 0;
      const sum = [0, 0, 0];
      for (const m of box.members) {
        weight += counts[m];
        for (let c = 0; c < channels; c++) sum[c] += values[m * channels + c] * counts[m];
      }
      for (let c = 0; c < channels; c++) centroids[b * channels + c] = sum[c] / weight;
    });
  }

  const k = centroids.length / channels;
  const assignment = new Uint16Array(n);
  const assign = () => {
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDistance = Infinity;
      for (let j = 0; j < k; j++) {
        let d = 0;
        for (let c = 0; c < channels; c++) {
          const diff = values[i * channels + c] - centroids[j * channels + c];
          d += diff * diff;
        }
        if (d < bestDistance) {
          bestDistance = d;
          best = j;
        }
      }
      assignment[i] = best;
    }
  };

  if (n > 256) {
    for (let iteration = 0; iteration < 3; iteration++) {
      assign();
      const sums = new Float64Array(k * channels);
      const weights = new Float64Array(k);
      for (let i = 0; i < n; i++) {
        const j = assignment[i];
        weights[j] += counts[i];
        for (let c = 0; c < channels; c++) sums[j * channels + c] += values[i * channels + c] * counts[i];
      }
      for (let j = 0; j < k; j++) {
        if (weights[j]) for (let c = 0; c < channels; c++) centroids[j * channels + c] = sums[j * channels + c] / weights[j];
      }
    }
  }

  const entries = new Uint8Array(k * channels);
  for (let i = 0; i < entries.length; i++) entries[i] = Math.round(centroids[i]);
  // Final assignment against the rounded palette, measuring the error.
  for (let j = 0; j < k * channels; j++) centroids[j] = entries[j];
  assign();

  let squaredError = 0;
  let pixelsTotal = 0;
  const lookup = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    lookup.set(colors[i], assignment[i]);
    let d = 0;
    for (let c = 0; c < channels; c++) {
      const diff = values[i * channels + c] - entries[assignment[i] * channels + c];
      d += diff * diff;
    }
    squaredError += (d / channels) * counts[i];
    pixelsTotal += counts[i];
  }

  const indices = new Uint8Array(pixels.length / channels);
  for (let p = 0, i = 0; i < pixels.length; i += channels, p++) {
    const color =
      channels === 3 ? (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2] : pixels[i];
    indices[p] = lookup.get(color)!;
  }

  const mse = squaredError / pixelsTotal;
  return {
    entries,
    size: k,
    indices,
    psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse),
  };
}

/** Packs 8-bit palette indices into 1, 2 or 4 bits per pixel, rows byte-aligned. */
export function packIndices(indices: Uint8Array, width: number, height: number, bits: 1 | 2 | 4 | 8) {
  if (bits === 8) return indices;
  const perByte = 8 / bits;
  const rowBytes = Math.ceil(width / perByte);
  const out = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const shift = 8 - bits * ((x % perByte) + 1);
      out[y * rowBytes + Math.floor(x / perByte)] |= indices[y * width + x] << shift;
    }
  }
  return out;
}

export function bitsForPalette(size: number): 1 | 2 | 4 | 8 {
  return size <= 2 ? 1 : size <= 4 ? 2 : size <= 16 ? 4 : 8;
}

// ---------------------------------------------------------------------------
// PNG prediction (FlateDecode /Predictor 15)
// ---------------------------------------------------------------------------

/**
 * Applies per-row adaptive PNG filters (None/Sub/Up/Average/Paeth, chosen by
 * minimum sum of absolute differences). Rows get a leading filter-type byte.
 */
export function pngPredict(data: Uint8Array, width: number, height: number, channels: number) {
  const row = width * channels;
  const out = new Uint8Array((row + 1) * height);
  const candidates = Array.from({ length: 5 }, () => new Uint8Array(row));
  let previous: Uint8Array = new Uint8Array(row);

  for (let y = 0; y < height; y++) {
    const current = data.subarray(y * row, (y + 1) * row);
    let bestFilter = 0;
    let bestSum = Infinity;
    for (let filter = 0; filter < 5; filter++) {
      const line = candidates[filter];
      let sum = 0;
      for (let x = 0; x < row; x++) {
        const left = x >= channels ? current[x - channels] : 0;
        const up = previous[x];
        const upLeft = x >= channels ? previous[x - channels] : 0;
        let predicted: number;
        if (filter === 0) predicted = 0;
        else if (filter === 1) predicted = left;
        else if (filter === 2) predicted = up;
        else if (filter === 3) predicted = (left + up) >> 1;
        else {
          const pa = Math.abs(up - upLeft);
          const pb = Math.abs(left - upLeft);
          const pc = Math.abs(left + up - 2 * upLeft);
          predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        }
        const value = (current[x] - predicted) & 255;
        line[x] = value;
        sum += value < 128 ? value : 256 - value;
        if (sum >= bestSum) break;
      }
      if (sum < bestSum) {
        bestSum = sum;
        bestFilter = filter;
      }
    }
    out[y * (row + 1)] = bestFilter;
    out.set(candidates[bestFilter], y * (row + 1) + 1);
    previous = current;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Black-and-white scan detection
// ---------------------------------------------------------------------------

export function toLuma(pixels: Uint8Array, channels: 1 | 3): Uint8Array<ArrayBufferLike> {
  if (channels === 1) return pixels;
  const out = new Uint8Array(pixels.length / 3);
  for (let i = 0, j = 0; j < out.length; i += 3, j++) {
    out[j] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8;
  }
  return out;
}

/**
 * True if the image contains coloured marks (stamps, signatures,
 * highlights) that must keep their colour. Only pixels whose whole 3×3
 * neighbourhood is coloured count, so the 1–2px colour fringes that colour
 * scanners leave around black text are ignored, while a pen stroke isn't.
 */
function hasInkColor(pixels: Uint8Array, width: number, height: number): boolean {
  const colorful = new Uint8Array(width * height);
  for (let p = 0, i = 0; p < colorful.length; p++, i += 3) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = r > g ? (r > b ? r : b) : g > b ? g : b;
    const min = r < g ? (r < b ? r : b) : g < b ? g : b;
    colorful[p] = max - min > 64 ? 1 : 0;
  }
  let solid = 0;
  const limit = width * height * 0.00005;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (
        colorful[p] &&
        colorful[p - 1] && colorful[p + 1] &&
        colorful[p - width] && colorful[p + width] &&
        colorful[p - width - 1] && colorful[p - width + 1] &&
        colorful[p + width - 1] && colorful[p + width + 1] &&
        ++solid > limit
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Decides whether an image is a black-and-white document scan (text, line
 * art) that can become a 1-bit image. Returns the threshold to use, or null.
 *
 * Requirements: practically no colour, a strongly two-peaked brightness
 * histogram (Otsu separability), a plausible amount of ink, and few mid-tones.
 */
export function detectBilevel(
  pixels: Uint8Array,
  channels: 1 | 3,
  width: number
): number | null {
  const pixelCount = pixels.length / channels;
  if (channels === 3 && hasInkColor(pixels, width, pixelCount / width)) return null;

  const luma = toLuma(pixels, channels);
  const histogram = new Float64Array(256);
  for (let i = 0; i < luma.length; i++) histogram[luma[i]]++;

  let total = 0;
  for (let v = 0; v < 256; v++) total += v * histogram[v];
  const mean = total / pixelCount;
  let variance = 0;
  for (let v = 0; v < 256; v++) variance += histogram[v] * (v - mean) ** 2;
  variance /= pixelCount;
  if (variance < 1) return null;

  // Otsu's method: threshold maximising between-class variance.
  let weightBelow = 0;
  let sumBelow = 0;
  let bestThreshold = 0;
  let bestBetween = 0;
  for (let t = 0; t < 256; t++) {
    weightBelow += histogram[t];
    if (!weightBelow) continue;
    const weightAbove = pixelCount - weightBelow;
    if (!weightAbove) break;
    sumBelow += t * histogram[t];
    const meanBelow = sumBelow / weightBelow;
    const meanAbove = (total - sumBelow) / weightAbove;
    const between = (weightBelow * weightAbove * (meanBelow - meanAbove) ** 2) / (pixelCount * pixelCount);
    if (between > bestBetween) {
      bestBetween = between;
      bestThreshold = t;
    }
  }

  const separability = bestBetween / variance;
  let ink = 0;
  let midtones = 0;
  for (let v = 0; v < 256; v++) {
    if (v <= bestThreshold) ink += histogram[v];
    if (v > 70 && v < 185) midtones += histogram[v];
  }
  const inkRatio = ink / pixelCount;
  const midtoneRatio = midtones / pixelCount;

  if (separability < 0.85 || midtoneRatio > 0.08 || inkRatio < 0.003 || inkRatio > 0.35) {
    return null;
  }
  return bestThreshold;
}

export function threshold(luma: Uint8Array, cutoff: number): Uint8Array {
  const out = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i++) out[i] = luma[i] <= cutoff ? 1 : 0;
  return out;
}

// ---------------------------------------------------------------------------
// Perceptual similarity
// ---------------------------------------------------------------------------

/**
 * Mean SSIM of two luma images over non-overlapping 8×8 blocks. Used to pick
 * the lowest JPEG quality that still looks the same.
 */
export function ssim(a: Uint8Array, b: Uint8Array, width: number, height: number): number {
  const C1 = 6.5025;
  const C2 = 58.5225;
  let total = 0;
  let blocks = 0;
  for (let by = 0; by + 8 <= height; by += 8) {
    for (let bx = 0; bx + 8 <= width; bx += 8) {
      let sa = 0;
      let sb = 0;
      let saa = 0;
      let sbb = 0;
      let sab = 0;
      for (let y = 0; y < 8; y++) {
        let k = (by + y) * width + bx;
        for (let x = 0; x < 8; x++, k++) {
          const va = a[k];
          const vb = b[k];
          sa += va;
          sb += vb;
          saa += va * va;
          sbb += vb * vb;
          sab += va * vb;
        }
      }
      const ma = sa / 64;
      const mb = sb / 64;
      const varA = (saa - sa * ma) / 63;
      const varB = (sbb - sb * mb) / 63;
      const cov = (sab - sa * mb) / 63;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (varA + varB + C2));
      blocks++;
    }
  }
  return blocks ? total / blocks : 1;
}
