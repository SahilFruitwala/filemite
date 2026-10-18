/**
 * Builds a .ico container from PNG buffers. Modern ICO files may embed PNG
 * data directly (supported by every browser for favicons), so no image
 * decoding is required — we only read each PNG's IHDR for its dimensions.
 */

function pngDimensions(png: Uint8Array): { width: number; height: number } {
  // PNG signature (8 bytes) + IHDR length/type (8 bytes) → width/height at 16/20
  if (png.length < 24 || png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
    throw new Error('Not a PNG file');
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function pngsToIco(pngs: Uint8Array[]): Uint8Array {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const dirSize = HEADER_SIZE + ENTRY_SIZE * pngs.length;
  const total = dirSize + pngs.reduce((sum, p) => sum + p.length, 0);

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, pngs.length, true);

  let offset = dirSize;
  pngs.forEach((png, i) => {
    const { width, height } = pngDimensions(png);
    if (width > 256 || height > 256) {
      throw new Error('ICO images must be 256x256 or smaller');
    }
    const entry = HEADER_SIZE + i * ENTRY_SIZE;
    out[entry] = width === 256 ? 0 : width;
    out[entry + 1] = height === 256 ? 0 : height;
    out[entry + 2] = 0; // palette
    out[entry + 3] = 0; // reserved
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });

  return out;
}
