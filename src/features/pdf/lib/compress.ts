/**
 * PDF compression that keeps text and vector graphics sharp and searchable.
 *
 * 1. Strip data that is never displayed: editor private data (Illustrator /
 *    Photoshop `PieceInfo`), embedded page thumbnails, per-image metadata.
 * 2. Resample every image to the target DPI *for the size it is actually
 *    drawn on the page* (a 3000px photo shown 2 inches wide needs ~300px at
 *    150 DPI), together with its transparency mask.
 * 3. Pick the best encoding per image:
 *    - black-and-white scans become 1-bit CCITT G4 (5–10× smaller);
 *    - flat graphics (charts, logos, screenshots) become a ≤256-colour
 *      palette or PNG-predicted Flate — lossless or visually lossless;
 *    - photos become mozjpeg JPEGs at the lowest quality that keeps a target
 *      perceptual similarity (SSIM), so every image looks equally good.
 * 4. Optionally trim invisible excess precision from vector drawing commands.
 * 5. Subset fonts, then rewrite without duplicate or unused objects.
 */
import * as mupdf from "mupdf";
import { zlibSync } from "fflate";

import { encodeCcittG4 } from "./ccitt";
import { TARGET_LADDER } from "./compress-presets";
import { optimizeContentStream } from "./content-stream";
import { getPageCount, isOutOfMemory, save, withPdf } from "./document";
import {
  bitsForPalette,
  buildPalette,
  colorHistogram,
  detectBilevel,
  packIndices,
  pngPredict,
  ssim,
  threshold,
  toLuma,
  topColorCoverage,
} from "./image-analysis";
import { encodeMozJpeg } from "./jpeg-encoder";
import type { CompressOptions, PdfSource } from "./types";

/** Skip images smaller than this many pixels — icons and rules gain nothing. */
const MIN_IMAGE_PIXELS = 96 * 96;
/** Skip images whose decoded size would exhaust WASM memory. */
const MAX_IMAGE_PIXELS = 80_000_000;
/** Only resample when it shrinks the image meaningfully. */
const MIN_DOWNSCALE = 0.9;
/** Only replace an image when the new stream is clearly smaller. */
const MIN_IMAGE_SAVINGS = 0.9;
/**
 * Prefer a lossless or palette encoding over JPEG when it's at most this much
 * larger — more so for graphics, where JPEG rings around text and lines.
 */
const LOSSLESS_PREFERENCE = 1.15;
const GRAPHIC_LOSSLESS_PREFERENCE = 1.5;
/** Share of pixels the top 8 colours must cover for an image to count as a graphic. */
const GRAPHIC_COVERAGE = 0.6;
/** Images with this few colours are flat art; lossless always wins. */
const FLAT_ART_COLORS = 64;
/** Scans below this resolution are too coarse to turn into 1-bit images. */
const MIN_BILEVEL_SOURCE_DPI = 150;
/** Only rewrite a content stream when it shrinks by at least 3%. */
const MIN_STREAM_SAVINGS = 0.97;
const MIN_STREAM_BYTES = 1024;

export type CompressStats = {
  imagesFound: number;
  imagesRewritten: number;
  /** How many rewritten images used each encoding. */
  encodings: Record<Encoding["kind"], number>;
  streamsOptimized: number;
  /** Embedded font programs in the document (what subsetting can trim). */
  fontsEmbedded: number;
  fontsSubset: boolean;
};

type Size = { width: number; height: number };
type Progress = (done: number, total: number) => void;
type Disposable = { destroy(): void };

function isName(obj: mupdf.PDFObject, name: string) {
  return obj.isName() && obj.asName() === name;
}

function filtersOf(obj: mupdf.PDFObject): mupdf.PDFObject[] {
  const filter = obj.get("Filter");
  return filter.isArray()
    ? Array.from({ length: filter.length }, (_, i) => filter.get(i))
    : [filter];
}

function forEachStream(doc: mupdf.PDFDocument, fn: (ref: mupdf.PDFObject) => void) {
  const count = doc.countObjects();
  for (let num = 1; num < count; num++) {
    const ref = doc.newIndirect(num);
    // Streams are only recognisable through their indirect reference.
    if (ref.isStream()) fn(ref);
  }
}

function countEmbeddedFonts(doc: mupdf.PDFDocument): number {
  let fonts = 0;
  const count = doc.countObjects();
  for (let num = 1; num < count; num++) {
    const obj = doc.newIndirect(num);
    if (
      isName(obj.get("Type"), "FontDescriptor") &&
      ["FontFile", "FontFile2", "FontFile3"].some((key) => obj.get(key).isIndirect())
    ) {
      fonts++;
    }
  }
  return fonts;
}

function forEachPage(doc: mupdf.PDFDocument, fn: (page: mupdf.PDFPage) => void) {
  const count = doc.countPages();
  for (let i = 0; i < count; i++) {
    const page = doc.loadPage(i);
    try {
      fn(page);
    } finally {
      page.destroy();
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Data that is never displayed
// ---------------------------------------------------------------------------

function stripHiddenData(doc: mupdf.PDFDocument) {
  doc.getTrailer().get("Root").delete("PieceInfo");
  forEachPage(doc, (page) => {
    const obj = page.getObject();
    obj.delete("PieceInfo");
    obj.delete("Thumb");
  });
  forEachStream(doc, (ref) => {
    const subtype = ref.get("Subtype");
    if (isName(subtype, "Image") || isName(subtype, "Form")) {
      ref.delete("PieceInfo");
      ref.delete("Metadata");
    }
    if (isName(subtype, "Image")) {
      ref.delete("Alternates");
      ref.delete("OPI");
    }
  });
}

// ---------------------------------------------------------------------------
// 2. How large each image is drawn
// ---------------------------------------------------------------------------

/** Collects image XObjects reachable from a resource dictionary (through forms and patterns). */
function collectImages(
  resources: mupdf.PDFObject,
  out: Map<number, mupdf.PDFObject>,
  visited: Set<number>
) {
  if (!resources.isDictionary()) return;
  const visit = (obj: mupdf.PDFObject) => {
    if (!obj.isIndirect()) return;
    const num = obj.asIndirect();
    if (visited.has(num)) return;
    visited.add(num);
    if (isName(obj.get("Subtype"), "Image")) out.set(num, obj);
    else collectImages(obj.get("Resources"), out, visited);
  };
  for (const key of ["XObject", "Pattern"]) {
    const dict = resources.get(key);
    if (dict.isDictionary()) dict.forEach(visit);
  }
}

function pageImages(page: mupdf.PDFPage) {
  const out = new Map<number, mupdf.PDFObject>();
  const visited = new Set<number>();
  const obj = page.getObject();
  collectImages(obj.getInheritable("Resources"), out, visited);

  const annots = obj.get("Annots");
  for (let i = 0; i < (annots.isArray() ? annots.length : 0); i++) {
    const normal = annots.get(i).get("AP").get("N");
    // /N is either an appearance stream or a dictionary of them per state.
    const streams = normal.isStream() ? [normal] : [];
    if (!normal.isStream() && normal.isDictionary()) normal.forEach((value) => streams.push(value));
    for (const stream of streams) collectImages(stream.get("Resources"), out, visited);
  }
  return out;
}

/**
 * Runs every page through a measuring device and records, per image object,
 * the largest size (in points) it is drawn at. MuPDF caches decoded images
 * per object, so an image seen by the device has the same native pointer as
 * `loadImage()` on its object straight afterwards.
 */
function measureImagePlacements(doc: mupdf.PDFDocument) {
  const placements = new Map<number, Size>();
  /** Every image object some page (or its annotations) refers to. */
  const used = new Set<number>();

  forEachPage(doc, (page) => {
    const drawn = new Map<number, Size>();
    const device = new mupdf.Device({
      fillImage(image: mupdf.Image, ctm: mupdf.Matrix) {
        const width = Math.hypot(ctm[0], ctm[1]);
        const height = Math.hypot(ctm[2], ctm[3]);
        const previous = drawn.get(image.pointer);
        drawn.set(image.pointer, {
          width: Math.max(previous?.width ?? 0, width),
          height: Math.max(previous?.height ?? 0, height),
        });
      },
    });
    try {
      page.run(device, mupdf.Matrix.identity);
    } catch {
      // Partial measurements are still useful; unmeasured images fall back.
    } finally {
      device.close();
      device.destroy();
    }

    for (const [num, ref] of pageImages(page)) {
      used.add(num);
      if (!drawn.size) continue;
      let image: mupdf.Image;
      try {
        image = doc.loadImage(ref);
      } catch {
        continue;
      }
      const size = drawn.get(image.pointer);
      image.destroy();
      if (!size) continue;
      const previous = placements.get(num);
      placements.set(num, {
        width: Math.max(previous?.width ?? 0, size.width),
        height: Math.max(previous?.height ?? 0, size.height),
      });
    }
  });

  return { placements, used };
}

/** Longest page side in points across the document. */
function longestPageSide(doc: mupdf.PDFDocument): number {
  let longest = 0;
  forEachPage(doc, (page) => {
    const [x0, y0, x1, y1] = page.getBounds();
    longest = Math.max(longest, x1 - x0, y1 - y0);
  });
  return longest || 792;
}

// ---------------------------------------------------------------------------
// 3. Image re-encoding
// ---------------------------------------------------------------------------

type Encoding = {
  kind: "bilevel" | "palette" | "lossless" | "jpeg";
  data: Uint8Array;
  filter: "DCTDecode" | "FlateDecode" | "CCITTFaxDecode";
  width: number;
  height: number;
  bitsPerComponent: 1 | 2 | 4 | 8;
  decodeParms?: Record<string, number>;
  palette?: { entries: Uint8Array; size: number };
};

function canRecompress(ref: mupdf.PDFObject): boolean {
  if (ref.get("ImageMask").asBoolean()) return false;
  // Colour-key masks depend on exact colours, which lossy encodings can't keep.
  if (ref.get("Mask").isArray()) return false;
  const bpc = ref.get("BitsPerComponent");
  if (bpc.isNumber() && bpc.asNumber() < 8) return false;
  return !filtersOf(ref).some(
    (f) => isName(f, "JBIG2Decode") || isName(f, "CCITTFaxDecode")
  );
}

/** Original colour space can stay when pixels weren't converted to another space. */
function keepsColorSpace(ref: mupdf.PDFObject): boolean {
  const cs = ref.get("ColorSpace");
  if (isName(cs, "DeviceRGB") || isName(cs, "DeviceGray")) return true;
  return cs.isArray() && isName(cs.get(0), "ICCBased");
}

/** Copies pixmap samples out of WASM memory as tightly packed rows. */
function packSamples(pixmap: mupdf.Pixmap): Uint8Array {
  const width = pixmap.getWidth();
  const height = pixmap.getHeight();
  const components = pixmap.getNumberOfComponents() + (pixmap.getAlpha() ? 1 : 0);
  const stride = pixmap.getStride();
  const pixels = pixmap.getPixels();
  const row = width * components;
  if (stride === row) return new Uint8Array(pixels.buffer, pixels.byteOffset, row * height).slice();
  const packed = new Uint8Array(row * height);
  for (let y = 0; y < height; y++) {
    packed.set(new Uint8Array(pixels.buffer, pixels.byteOffset + y * stride, row), y * row);
  }
  return packed;
}

/** Downsamples through MuPDF's area-averaging scaler. */
function resample(
  pixmap: mupdf.Pixmap,
  colorspace: mupdf.ColorSpace,
  width: number,
  height: number,
  disposables: Disposable[]
): mupdf.Pixmap {
  const source = new mupdf.Image(pixmap);
  const target = new mupdf.Pixmap(colorspace, [0, 0, width, height], false);
  disposables.push(source, target);
  target.clear(255);
  const device = new mupdf.DrawDevice(mupdf.Matrix.identity, target);
  device.fillImage(source, [width, 0, 0, height, 0, 0], 1);
  device.close();
  device.destroy();
  return target;
}

function rawLength(ref: mupdf.PDFObject) {
  const buffer = ref.readRawStream();
  const length = buffer.getLength();
  buffer.destroy();
  return length;
}

function predictorParms(columns: number, colors: number) {
  return { Predictor: 15, Colors: colors, BitsPerComponent: 8, Columns: columns };
}

/** Flate with adaptive PNG prediction. */
function encodeFlate(samples: Uint8Array, width: number, height: number, channels: number) {
  const predicted = zlibSync(pngPredict(samples, width, height, channels), { level: 7 });
  return { data: predicted, decodeParms: predictorParms(width, channels) };
}

/** 1-bit G4 version of a black-and-white scan, at no more than `dpi`. */
function encodeBilevel(
  pixels: mupdf.Pixmap,
  samples: Uint8Array,
  channels: 1 | 3,
  cutoff: number,
  scale: number,
  disposables: Disposable[]
): Encoding {
  let width = pixels.getWidth();
  let height = pixels.getHeight();
  let luma = toLuma(samples, channels);
  if (scale < MIN_DOWNSCALE) {
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    let gray = pixels;
    if (channels === 3) {
      gray = pixels.convertToColorSpace(mupdf.ColorSpace.DeviceGray, false);
      disposables.push(gray);
    }
    luma = packSamples(resample(gray, mupdf.ColorSpace.DeviceGray, width, height, disposables));
  }
  return {
    kind: "bilevel",
    data: encodeCcittG4(threshold(luma, cutoff), width, height),
    filter: "CCITTFaxDecode",
    width,
    height,
    bitsPerComponent: 1,
    decodeParms: { K: -1, Columns: width, Rows: height },
  };
}

function decodeLuma(jpeg: Uint8Array): Uint8Array {
  const image = new mupdf.Image(jpeg);
  const pixmap = image.toPixmap();
  const samples = packSamples(pixmap);
  const channels = pixmap.getNumberOfComponents() as 1 | 3;
  pixmap.destroy();
  image.destroy();
  return toLuma(samples, channels);
}

/**
 * Finds the lowest JPEG quality within the preset's range whose result keeps
 * at least `minSsim` similarity, by bisection (about four encodes).
 */
function encodeJpeg(
  pixels: mupdf.Pixmap,
  samples: Uint8Array,
  channels: 1 | 3,
  options: CompressOptions
): Encoding {
  const width = pixels.getWidth();
  const height = pixels.getHeight();
  const encode = (quality: number) =>
    encodeMozJpeg(samples, channels, width, height, quality) ??
    pixels.asJPEG(quality, false).slice();
  const reference = toLuma(samples, channels);

  let low = options.minQuality;
  let high = options.maxQuality;
  let best: Uint8Array | null = null;
  while (high - low > 4) {
    const quality = Math.round((low + high) / 2);
    const candidate = encode(quality);
    if (ssim(reference, decodeLuma(candidate), width, height) >= options.minSsim) {
      best = candidate;
      high = quality;
    } else {
      low = quality;
    }
  }
  return {
    kind: "jpeg",
    data: best ?? encode(high),
    filter: "DCTDecode",
    width,
    height,
    bitsPerComponent: 8,
  };
}

/** Best of palette / lossless / JPEG for an already resampled image. */
function chooseEncoding(
  pixels: mupdf.Pixmap,
  channels: 1 | 3,
  options: CompressOptions
): Encoding {
  const width = pixels.getWidth();
  const height = pixels.getHeight();
  const samples = packSamples(pixels);
  const histogram = colorHistogram(samples, channels);
  const isGraphic = !!histogram && topColorCoverage(histogram, 8) >= GRAPHIC_COVERAGE;

  let lossless: Encoding | null = null;
  if (histogram && isGraphic) {
    const palette = buildPalette(samples, channels, histogram);
    if (palette.psnr >= options.minPalettePsnr) {
      const bits = bitsForPalette(palette.size);
      const packed = packIndices(palette.indices, width, height, bits);
      let data = zlibSync(packed, { level: 9 });
      let decodeParms: Record<string, number> | undefined;
      if (bits === 8) {
        const predicted = zlibSync(pngPredict(palette.indices, width, height, 1), { level: 9 });
        if (predicted.length < data.length) {
          data = predicted;
          decodeParms = predictorParms(width, 1);
        }
      }
      lossless = {
        kind: "palette",
        data,
        filter: "FlateDecode",
        width,
        height,
        bitsPerComponent: bits,
        decodeParms,
        palette: { entries: palette.entries, size: palette.size },
      };
    }
    if (palette.psnr !== Infinity) {
      const flate = encodeFlate(samples, width, height, channels);
      if (!lossless || flate.data.length <= lossless.data.length) {
        lossless = { kind: "lossless", filter: "FlateDecode", width, height, bitsPerComponent: 8, ...flate };
      }
    }
    if (lossless && histogram.colors.length <= FLAT_ART_COLORS) return lossless;
  }

  const jpeg = encodeJpeg(pixels, samples, channels, options);
  const preference = isGraphic ? GRAPHIC_LOSSLESS_PREFERENCE : LOSSLESS_PREFERENCE;
  return lossless && lossless.data.length <= jpeg.data.length * preference ? lossless : jpeg;
}

function writeImage(
  doc: mupdf.PDFDocument,
  ref: mupdf.PDFObject,
  encoding: Encoding,
  colorSpace: mupdf.PDFObject | string
) {
  ref.writeRawStream(encoding.data);
  ref.put("Filter", doc.newName(encoding.filter));
  if (encoding.decodeParms) ref.put("DecodeParms", encoding.decodeParms);
  else ref.delete("DecodeParms");
  ref.delete("Decode");
  ref.put("Width", encoding.width);
  ref.put("Height", encoding.height);
  ref.put("BitsPerComponent", encoding.bitsPerComponent);

  const base = typeof colorSpace === "string" ? doc.newName(colorSpace) : colorSpace;
  if (encoding.palette) {
    const indexed = doc.newArray();
    indexed.push(doc.newName("Indexed"));
    indexed.push(base);
    indexed.push(encoding.palette.size - 1);
    indexed.push(doc.newByteString(encoding.palette.entries));
    ref.put("ColorSpace", indexed);
  } else {
    ref.put("ColorSpace", base);
  }
}

/** Shrinks an image's soft mask (transparency) to match its resampled image. */
function resampleSoftMask(doc: mupdf.PDFDocument, smask: mupdf.PDFObject, width: number, height: number) {
  if (smask.get("Matte").isArray()) return;
  const disposables: Disposable[] = [];
  try {
    const image = doc.loadImage(smask);
    disposables.push(image);
    if (image.getWidth() * image.getHeight() <= width * height * 1.2) return;
    const pixmap = image.toPixmap();
    disposables.push(pixmap);
    if (!pixmap.getColorSpace()?.isGray() || pixmap.getAlpha()) return;
    const scaled = resample(pixmap, mupdf.ColorSpace.DeviceGray, width, height, disposables);
    const flate = encodeFlate(packSamples(scaled), width, height, 1);
    if (flate.data.length >= rawLength(smask)) return;
    writeImage(
      doc,
      smask,
      { kind: "lossless", filter: "FlateDecode", width, height, bitsPerComponent: 8, ...flate },
      "DeviceGray"
    );
  } finally {
    disposables.reverse().forEach((item) => item.destroy());
  }
}

/**
 * Re-encodes one image. `drawn` is the largest size (in points) the image is
 * drawn at, when known; otherwise `fallbackMaxSide` caps its pixel size.
 */
function recompressImage(
  doc: mupdf.PDFDocument,
  ref: mupdf.PDFObject,
  drawn: Size | undefined,
  fallbackMaxSide: number,
  options: CompressOptions,
  softMaskUses: Map<number, number>
): Encoding["kind"] | null {
  if (!canRecompress(ref)) return null;

  const disposables: Disposable[] = [];
  try {
    const image = doc.loadImage(ref);
    disposables.push(image);
    const width = image.getWidth();
    const height = image.getHeight();
    if (width * height < MIN_IMAGE_PIXELS || width * height > MAX_IMAGE_PIXELS) return null;

    let pixels = image.toPixmap();
    disposables.push(pixels);
    if (pixels.getAlpha()) return null;

    const source = pixels.getColorSpace();
    let target: mupdf.ColorSpace;
    let converted: boolean;
    if (options.grayscale || source?.isGray()) {
      target = mupdf.ColorSpace.DeviceGray;
      converted = !source?.isGray();
    } else {
      target = mupdf.ColorSpace.DeviceRGB;
      converted = !source?.isRGB();
    }
    if (converted) {
      pixels = pixels.convertToColorSpace(target, false);
      disposables.push(pixels);
    }
    const channels = target === mupdf.ColorSpace.DeviceGray ? 1 : 3;

    /** Scale needed to reach `dpi` at the drawn size (≤ 1). */
    const scaleFor = (dpi: number) =>
      Math.min(
        1,
        drawn
          ? Math.max(((drawn.width / 72) * dpi) / width, ((drawn.height / 72) * dpi) / height)
          : (fallbackMaxSide * (dpi / options.dpi)) / Math.max(width, height)
      );

    let encoding: Encoding | null = null;
    const sourceDpi = drawn ? width / (drawn.width / 72) : Infinity;
    if (options.bilevelDpi > 0 && sourceDpi >= MIN_BILEVEL_SOURCE_DPI) {
      const samples = packSamples(pixels);
      const cutoff = detectBilevel(samples, channels, width);
      if (cutoff !== null) {
        encoding = encodeBilevel(pixels, samples, channels, cutoff, scaleFor(options.bilevelDpi), disposables);
      }
    }

    if (!encoding) {
      const scale = scaleFor(options.dpi);
      if (scale < MIN_DOWNSCALE) {
        const outWidth = Math.max(1, Math.round(width * scale));
        const outHeight = Math.max(1, Math.round(height * scale));
        pixels = resample(pixels, target, outWidth, outHeight, disposables);
      }
      encoding = chooseEncoding(pixels, channels, options);
    }

    if (encoding.data.length >= rawLength(ref) * MIN_IMAGE_SAVINGS) return null;

    const colorSpace =
      !converted && keepsColorSpace(ref)
        ? ref.get("ColorSpace")
        : channels === 1
          ? "DeviceGray"
          : "DeviceRGB";
    writeImage(doc, ref, encoding, encoding.kind === "bilevel" ? "DeviceGray" : colorSpace);

    const smask = ref.get("SMask");
    if (
      (encoding.width !== width || encoding.height !== height) &&
      smask.isIndirect() &&
      softMaskUses.get(smask.asIndirect()) === 1
    ) {
      try {
        resampleSoftMask(doc, smask, encoding.width, encoding.height);
      } catch {
        // A full-resolution mask still renders correctly.
      }
    }
    return encoding.kind;
  } finally {
    disposables.reverse().forEach((item) => item.destroy());
  }
}

function listImages(doc: mupdf.PDFDocument) {
  const images: mupdf.PDFObject[] = [];
  const softMaskUses = new Map<number, number>();
  forEachStream(doc, (ref) => {
    if (!isName(ref.get("Subtype"), "Image")) return;
    images.push(ref);
    const smask = ref.get("SMask");
    if (smask.isIndirect()) {
      const num = smask.asIndirect();
      softMaskUses.set(num, (softMaskUses.get(num) ?? 0) + 1);
    }
  });
  // Soft masks are handled together with the image they belong to.
  return {
    images: images.filter((ref) => !softMaskUses.has(ref.asIndirect())),
    softMaskUses,
  };
}

// ---------------------------------------------------------------------------
// 4. Vector drawing commands
// ---------------------------------------------------------------------------

function contentStreams(doc: mupdf.PDFDocument): mupdf.PDFObject[] {
  const streams = new Map<number, mupdf.PDFObject>();
  const add = (obj: mupdf.PDFObject) => {
    if (obj.isIndirect() && obj.isStream()) streams.set(obj.asIndirect(), obj);
  };
  forEachPage(doc, (page) => {
    const contents = page.getObject().get("Contents");
    if (contents.isArray()) {
      for (let i = 0; i < contents.length; i++) add(contents.get(i));
    } else {
      add(contents);
    }
  });
  forEachStream(doc, (ref) => {
    const patternType = ref.get("PatternType");
    if (isName(ref.get("Subtype"), "Form") || (patternType.isNumber() && patternType.asNumber() === 1)) {
      add(ref);
    }
  });
  return [...streams.values()];
}

function optimizeStream(ref: mupdf.PDFObject): boolean {
  const buffer = ref.readStream();
  const decoded = buffer.asUint8Array().slice();
  buffer.destroy();
  if (decoded.length < MIN_STREAM_BYTES) return false;
  const optimized = optimizeContentStream(decoded);
  if (!optimized || optimized.length >= decoded.length * MIN_STREAM_SAVINGS) return false;
  // Stored uncompressed here; the final save Flate-compresses it.
  ref.writeStream(optimized);
  return true;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function optimizeDocument(
  doc: mupdf.PDFDocument,
  options: CompressOptions,
  onProgress?: Progress
): Omit<CompressStats, "fontsSubset"> {
  stripHiddenData(doc);

  const { placements, used } = measureImagePlacements(doc);
  const fallbackMaxSide = (longestPageSide(doc) / 72) * options.dpi;
  const listed = listImages(doc);
  const softMaskUses = listed.softMaskUses;
  // Images nothing displays (e.g. the thumbnails removed above) are dropped
  // when saving, so there's no point re-encoding them.
  const images = listed.images.filter((ref) => used.has(ref.asIndirect()));
  const streams = options.optimizeVectors ? contentStreams(doc) : [];
  const total = images.length + streams.length + 1;
  let done = 0;

  let imagesRewritten = 0;
  const encodings: CompressStats["encodings"] = { bilevel: 0, palette: 0, lossless: 0, jpeg: 0 };
  for (const ref of images) {
    try {
      const kind = recompressImage(
        doc,
        ref,
        placements.get(ref.asIndirect()),
        fallbackMaxSide,
        options,
        softMaskUses
      );
      if (kind) {
        imagesRewritten++;
        encodings[kind]++;
      }
    } catch {
      // Leave images MuPDF can't decode exactly as they were.
    }
    onProgress?.(++done, total);
  }

  let streamsOptimized = 0;
  for (const ref of streams) {
    try {
      if (optimizeStream(ref)) streamsOptimized++;
    } catch {
      // Undecodable streams are left untouched.
    }
    onProgress?.(++done, total);
  }

  return {
    imagesFound: images.length,
    imagesRewritten,
    encodings,
    streamsOptimized,
    fontsEmbedded: countEmbeddedFonts(doc),
  };
}

function isValidOutput(bytes: Uint8Array, expectedPages: number) {
  try {
    const doc = new mupdf.PDFDocument(bytes);
    const ok = doc.countPages() === expectedPages;
    doc.destroy();
    return ok;
  } catch (error) {
    if (isOutOfMemory(error)) throw error;
    return false;
  }
}

export function compressPdf(
  source: PdfSource,
  options: CompressOptions,
  onProgress?: Progress
): { bytes: Uint8Array; stats: CompressStats } {
  let stats: Omit<CompressStats, "fontsSubset"> = {
    imagesFound: 0,
    imagesRewritten: 0,
    encodings: { bilevel: 0, palette: 0, lossless: 0, jpeg: 0 },
    streamsOptimized: 0,
    fontsEmbedded: 0,
  };

  const subset = withPdf(source, (doc) => {
    const pageCount = getPageCount(doc);
    stats = optimizeDocument(doc, options, (done, total) => onProgress?.(done, total + 1));
    // Subsetting is the riskiest step, so verify the output and fall back.
    try {
      doc.subsetFonts();
      const bytes = save(doc);
      return isValidOutput(bytes, pageCount) ? bytes : null;
    } catch (error) {
      if (isOutOfMemory(error)) throw error;
      return null;
    }
  });
  if (subset) return { bytes: subset, stats: { ...stats, fontsSubset: true } };

  // The first document is closed by now, so only one copy is in memory.
  const bytes = withPdf(source, (fresh) => {
    optimizeDocument(fresh, options);
    return save(fresh);
  });
  return { bytes, stats: { ...stats, fontsSubset: false } };
}

export type TargetResult = {
  bytes: Uint8Array;
  stats: CompressStats;
  /** False when even the strongest settings couldn't reach the target. */
  fitsTarget: boolean;
};

/**
 * Compresses to at most `targetBytes` with the best quality that fits:
 * bisects over TARGET_LADDER (best quality first), so it needs about three
 * full compressions. If nothing fits, returns the smallest result.
 */
export function compressToTarget(
  source: PdfSource,
  targetBytes: number,
  grayscale: boolean,
  onProgress?: Progress
): TargetResult {
  const results = new Map<number, { bytes: Uint8Array; stats: CompressStats }>();
  const steps = Math.ceil(Math.log2(TARGET_LADDER.length)) + 1;
  let attempt = 0;
  const run = (index: number) => {
    let result = results.get(index);
    if (!result) {
      const base = attempt++;
      result = compressPdf(source, { ...TARGET_LADDER[index], grayscale }, (done, total) =>
        onProgress?.(base * total + done, steps * total)
      );
      results.set(index, result);
    }
    return result;
  };

  let low = 0;
  let high = TARGET_LADDER.length - 1;
  let fit: number | null = null;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (run(mid).bytes.length <= targetBytes) {
      fit = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  if (fit !== null) return { ...run(fit), fitsTarget: true };
  const smallest = run(TARGET_LADDER.length - 1);
  return { ...smallest, fitsTarget: false };
}
