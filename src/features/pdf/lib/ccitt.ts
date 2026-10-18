/**
 * CCITT Group 4 (ITU-T T.6) encoder for 1-bit images — the "fax" compression
 * every PDF reader supports through the CCITTFaxDecode filter. Black-and-white
 * scans typically shrink 5–10× compared to grayscale JPEG.
 *
 * Input is one byte per pixel, 1 = black, 0 = white. Output matches
 * `/DecodeParms << /K -1 /Columns width /Rows height >>` with BlackIs1 false.
 */

type Code = readonly [bits: number, length: number];

const code = (bits: string): Code => [parseInt(bits, 2), bits.length];

const WHITE_TERMINATING = [
  "00110101", "000111", "0111", "1000", "1011", "1100", "1110", "1111",
  "10011", "10100", "00111", "01000", "001000", "000011", "110100", "110101",
  "101010", "101011", "0100111", "0001100", "0001000", "0010111", "0000011", "0000100",
  "0101000", "0101011", "0010011", "0100100", "0011000", "00000010", "00000011", "00011010",
  "00011011", "00010010", "00010011", "00010100", "00010101", "00010110", "00010111", "00101000",
  "00101001", "00101010", "00101011", "00101100", "00101101", "00000100", "00000101", "00001010",
  "00001011", "01010010", "01010011", "01010100", "01010101", "00100100", "00100101", "01011000",
  "01011001", "01011010", "01011011", "01001010", "01001011", "00110010", "00110011", "00110100",
].map(code);

const BLACK_TERMINATING = [
  "0000110111", "010", "11", "10", "011", "0011", "0010", "00011",
  "000101", "000100", "0000100", "0000101", "0000111", "00000100", "00000111", "000011000",
  "0000010111", "0000011000", "0000001000", "00001100111", "00001101000", "00001101100", "00000110111", "00000101000",
  "00000010111", "00000011000", "000011001010", "000011001011", "000011001100", "000011001101", "000001101000", "000001101001",
  "000001101010", "000001101011", "000011010010", "000011010011", "000011010100", "000011010101", "000011010110", "000011010111",
  "000001101100", "000001101101", "000011011010", "000011011011", "000001010100", "000001010101", "000001010110", "000001010111",
  "000001100100", "000001100101", "000001010010", "000001010011", "000000100100", "000000110111", "000000111000", "000000100111",
  "000000101000", "000001011000", "000001011001", "000000101011", "000000101100", "000001011010", "000001100110", "000001100111",
].map(code);

/** Make-up codes for 64, 128, … 1728. */
const WHITE_MAKEUP = [
  "11011", "10010", "010111", "0110111", "00110110", "00110111", "01100100", "01100101",
  "01101000", "01100111", "011001100", "011001101", "011010010", "011010011", "011010100", "011010101",
  "011010110", "011010111", "011011000", "011011001", "011011010", "011011011", "010011000", "010011001",
  "010011010", "011000", "010011011",
].map(code);

const BLACK_MAKEUP = [
  "0000001111", "000011001000", "000011001001", "000001011011", "000000110011", "000000110100", "000000110101", "0000001101100",
  "0000001101101", "0000001001010", "0000001001011", "0000001001100", "0000001001101", "0000001110010", "0000001110011", "0000001110100",
  "0000001110101", "0000001110110", "0000001110111", "0000001010010", "0000001010011", "0000001010100", "0000001010101", "0000001011010",
  "0000001011011", "0000001100100", "0000001100101",
].map(code);

/** Extended make-up codes shared by both colours: 1792, 1856, … 2560. */
const EXTENDED_MAKEUP = [
  "00000001000", "00000001100", "00000001101", "000000010010", "000000010011", "000000010100", "000000010101",
  "000000010110", "000000010111", "000000011100", "000000011101", "000000011110", "000000011111",
].map(code);

const PASS = code("0001");
const HORIZONTAL = code("001");
/** Vertical mode codes indexed by (a1 − b1) + 3. */
const VERTICAL = ["0000010", "000010", "010", "1", "011", "000011", "0000011"].map(code);
const EOL = code("000000000001");

class BitWriter {
  private bytes: Uint8Array;
  private length = 0;
  private current = 0;
  private filled = 0;

  constructor(capacity: number) {
    this.bytes = new Uint8Array(Math.max(1024, capacity));
  }

  write([bits, count]: Code) {
    for (let i = count - 1; i >= 0; i--) {
      this.current = (this.current << 1) | ((bits >> i) & 1);
      if (++this.filled === 8) {
        if (this.length === this.bytes.length) {
          const grown = new Uint8Array(this.bytes.length * 2);
          grown.set(this.bytes);
          this.bytes = grown;
        }
        this.bytes[this.length++] = this.current;
        this.current = 0;
        this.filled = 0;
      }
    }
  }

  finish(): Uint8Array {
    if (this.filled) this.write([0, 8 - this.filled]);
    return this.bytes.slice(0, this.length);
  }
}

function writeRun(writer: BitWriter, run: number, black: boolean) {
  const terminating = black ? BLACK_TERMINATING : WHITE_TERMINATING;
  const makeup = black ? BLACK_MAKEUP : WHITE_MAKEUP;
  while (run >= 2624) {
    writer.write(EXTENDED_MAKEUP[EXTENDED_MAKEUP.length - 1]);
    run -= 2560;
  }
  if (run >= 64) {
    const chunk = run >> 6;
    writer.write(chunk <= 27 ? makeup[chunk - 1] : EXTENDED_MAKEUP[chunk - 28]);
    run &= 63;
  }
  writer.write(terminating[run]);
}

/** First position ≥ start whose pixel differs from `color`, or `width`. */
function nextChange(line: Uint8Array, offset: number, start: number, width: number, color: number) {
  let x = start;
  while (x < width && line[offset + x] === color) x++;
  return x;
}

export function encodeCcittG4(pixels: Uint8Array, width: number, height: number): Uint8Array {
  const writer = new BitWriter(Math.ceil((width * height) / 32));
  const white = new Uint8Array(width);

  for (let y = 0; y < height; y++) {
    const coding = pixels;
    const codingOffset = y * width;
    const reference = y === 0 ? white : pixels;
    const referenceOffset = y === 0 ? 0 : (y - 1) * width;
    const pixel = (x: number) => (x < width ? coding[codingOffset + x] : 0);
    const refPixel = (x: number) => (x < width ? reference[referenceOffset + x] : 0);

    let a0 = 0;
    let a1 = pixel(0) ? 0 : nextChange(coding, codingOffset, 0, width, 0);
    let b1 = refPixel(0) ? 0 : nextChange(reference, referenceOffset, 0, width, 0);

    for (;;) {
      const b2 = b1 < width ? nextChange(reference, referenceOffset, b1, width, refPixel(b1)) : width;
      if (b2 < a1) {
        writer.write(PASS);
        a0 = b2;
      } else {
        const delta = a1 - b1;
        if (delta >= -3 && delta <= 3) {
          writer.write(VERTICAL[delta + 3]);
          a0 = a1;
        } else {
          const a2 = a1 < width ? nextChange(coding, codingOffset, a1, width, pixel(a1)) : width;
          writer.write(HORIZONTAL);
          // At the start of a line the imaginary a0 is white.
          const startsWhite = a0 + a1 === 0 || pixel(a0) === 0;
          writeRun(writer, a1 - a0, !startsWhite);
          writeRun(writer, a2 - a1, startsWhite);
          a0 = a2;
        }
      }
      if (a0 >= width) break;
      const color = pixel(a0);
      a1 = nextChange(coding, codingOffset, a0, width, color);
      b1 = nextChange(reference, referenceOffset, a0, width, color ? 0 : 1);
      b1 = nextChange(reference, referenceOffset, b1, width, color);
    }
  }

  writer.write(EOL);
  writer.write(EOL);
  return writer.finish();
}
