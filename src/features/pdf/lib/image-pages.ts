/** Page layout for the Images to PDF tool. Pure maths, shared by the UI and the engine. */

export type PageSizeChoice = "fit" | "a4" | "letter";
export type OrientationChoice = "auto" | "portrait" | "landscape";
export type MarginChoice = "none" | "small" | "large";

export type ImagePageOptions = {
  pageSize: PageSizeChoice;
  orientation: OrientationChoice;
  margin: MarginChoice;
};

export const DEFAULT_IMAGE_PAGE_OPTIONS: ImagePageOptions = {
  pageSize: "a4",
  orientation: "auto",
  margin: "small",
};

/** Portrait page sizes in points (1/72 inch). */
const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

const MARGINS: Record<MarginChoice, number> = { none: 0, small: 18, large: 36 };

/** In "fit" mode an image is shown at 96 dpi, but never on a page longer than 20 inches. */
const FIT_POINTS_PER_PIXEL = 0.75;
const FIT_MAX_SIDE = 1440;

export type PageLayout = {
  pageWidth: number;
  pageHeight: number;
  /** Where the image goes, in PDF user space (origin bottom-left). */
  x: number;
  y: number;
  width: number;
  height: number;
};

export function layoutImagePage(
  imageWidth: number,
  imageHeight: number,
  options: ImagePageOptions
): PageLayout {
  const margin = MARGINS[options.margin];

  if (options.pageSize === "fit") {
    const scale = Math.min(FIT_POINTS_PER_PIXEL, FIT_MAX_SIDE / Math.max(imageWidth, imageHeight));
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return {
      pageWidth: width + margin * 2,
      pageHeight: height + margin * 2,
      x: margin,
      y: margin,
      width,
      height,
    };
  }

  const base = PAGE_SIZES[options.pageSize];
  const landscape =
    options.orientation === "auto"
      ? imageWidth > imageHeight
      : options.orientation === "landscape";
  const pageWidth = landscape ? base.height : base.width;
  const pageHeight = landscape ? base.width : base.height;

  const boxWidth = pageWidth - margin * 2;
  const boxHeight = pageHeight - margin * 2;
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}
