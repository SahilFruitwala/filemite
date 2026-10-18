/** Compression settings shared by the UI and the engine. */
import type { CompressOptions } from "./types";

export type CompressLevel = "light" | "balanced" | "strong";
export type CompressPreset = Omit<CompressOptions, "grayscale">;

export const COMPRESS_PRESETS: Record<CompressLevel, CompressPreset> = {
  light: {
    dpi: 200,
    minSsim: 0.975,
    minQuality: 60,
    maxQuality: 92,
    minPalettePsnr: 45,
    bilevelDpi: 0,
    optimizeVectors: false,
  },
  balanced: {
    dpi: 150,
    minSsim: 0.955,
    minQuality: 45,
    maxQuality: 85,
    minPalettePsnr: 40,
    bilevelDpi: 300,
    optimizeVectors: true,
  },
  strong: {
    dpi: 100,
    minSsim: 0.93,
    minQuality: 35,
    maxQuality: 75,
    minPalettePsnr: 36,
    bilevelDpi: 200,
    optimizeVectors: true,
  },
};

/**
 * Settings tried, best quality first, when aiming for a target file size.
 * The last two go beyond "Strong" for files that must get very small.
 */
export const TARGET_LADDER: CompressPreset[] = [
  COMPRESS_PRESETS.light,
  COMPRESS_PRESETS.balanced,
  COMPRESS_PRESETS.strong,
  { dpi: 72, minSsim: 0.91, minQuality: 30, maxQuality: 65, minPalettePsnr: 34, bilevelDpi: 200, optimizeVectors: true },
  { dpi: 50, minSsim: 0.88, minQuality: 25, maxQuality: 55, minPalettePsnr: 32, bilevelDpi: 150, optimizeVectors: true },
];
