/** Shared types between the UI, the engine client and the engine worker. */

export type PdfSource = {
  bytes: Uint8Array | ArrayBuffer;
  password?: string;
  /** File name, used in error messages and merge bookmarks. */
  name?: string;
};

export type PdfErrorCode = "password" | "invalid" | "unknown";

export type CompressOptions = {
  /** Target image resolution for the size each image is drawn at. */
  dpi: number;
  /** Lowest mean SSIM a JPEG may have versus the resampled image. */
  minSsim: number;
  /** JPEG quality search range, 1–100. */
  minQuality: number;
  maxQuality: number;
  /** Lowest PSNR (dB) allowed when reducing graphics to a 256-colour palette. */
  minPalettePsnr: number;
  /** Resolution for black-and-white scans converted to 1-bit; 0 disables it. */
  bilevelDpi: number;
  /** Convert images to grayscale. */
  grayscale: boolean;
  /** Trim invisible excess precision from vector drawing commands. */
  optimizeVectors: boolean;
};
