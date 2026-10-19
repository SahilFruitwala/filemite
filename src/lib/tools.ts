/**
 * Every tool in the app. Navigation, the home page, page headers, SEO and
 * the sitemap all read from this list.
 */
import {
  Crop,
  Eraser,
  EyeOff,
  FileArchive,
  FileOutput,
  FlipHorizontal2,
  Gem,
  ImageDown,
  Layers,
  Palette,
  RotateCw,
  Scaling,
  SplitSquareHorizontal,
  type LucideIcon,
} from 'lucide-react';

export type Section = 'image' | 'pdf';

/** Where the work happens — shown to users so they know what gets uploaded. */
export type Processing = 'server' | 'browser';

export type ToolId =
  | 'image-compress'
  | 'image-resize'
  | 'image-crop'
  | 'image-rotate'
  | 'image-redact'
  | 'image-scrub'
  | 'image-palette'
  | 'image-favicon'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-extract'
  | 'pdf-organize'
  | 'pdf-compress';

export type Tool = {
  id: ToolId;
  section: Section;
  href: string;
  title: string;
  shortTitle: string;
  /** One line for cards and headers. */
  description: string;
  /** Longer copy for search results. */
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  emptyTitle: string;
  emptyDescription: string;
  processing: Processing;
  icon: LucideIcon;
};

export const SECTIONS: Record<
  Section,
  { label: string; title: string; description: string; href: string }
> = {
  image: {
    label: 'Image',
    title: 'Image tools',
    description: 'Compress, resize, crop, rotate and clean up PNG, JPEG, WebP and HEIC.',
    href: '/image/compress',
  },
  pdf: {
    label: 'PDF',
    title: 'PDF tools',
    description: 'Merge, split, extract, organize and compress PDFs — entirely in your browser.',
    href: '/pdf/merge',
  },
};

export const tools: Tool[] = [
  {
    id: 'image-compress',
    section: 'image',
    href: '/image/compress',
    title: 'Compress Images',
    shortTitle: 'Compress',
    description: 'Shrink PNG, JPEG, WebP and HEIC files without visible quality loss.',
    seoTitle: 'Compress Images Online — PNG, JPEG, WebP, HEIC',
    seoDescription:
      'Compress up to 20 images at once. Smart presets for PNG, JPEG and WebP, HEIC input supported. Processed in memory and never stored.',
    keywords: [
      'image compressor',
      'compress png',
      'compress jpeg',
      'reduce image size',
      'webp converter',
    ],
    emptyTitle: 'Drop images to compress',
    emptyDescription: 'Add up to 20 images. Each is compressed as soon as it lands.',
    processing: 'server',
    icon: ImageDown,
  },
  {
    id: 'image-resize',
    section: 'image',
    href: '/image/resize',
    title: 'Resize Image',
    shortTitle: 'Resize',
    description: 'Set exact dimensions or pick a preset for social and web.',
    seoTitle: 'Resize Image Online — Exact Pixels or Presets',
    seoDescription:
      'Resize images to exact pixel dimensions or social media presets, with cover, contain, fill and fit-inside modes.',
    keywords: ['resize image', 'image resizer', 'change image size', 'instagram size'],
    emptyTitle: 'Choose an image to resize',
    emptyDescription: 'Then set the size you need — or pick a preset.',
    processing: 'server',
    icon: Scaling,
  },
  {
    id: 'image-crop',
    section: 'image',
    href: '/image/crop',
    title: 'Smart Crop',
    shortTitle: 'Crop',
    description: 'Content-aware crops for square, story and link-preview formats.',
    seoTitle: 'Smart Crop — Content-Aware Image Cropper',
    seoDescription:
      'Find the subject of a photo and crop it for Instagram square, stories and link previews automatically. Runs in your browser.',
    keywords: ['crop image', 'smart crop', 'photo cropper', 'instagram crop'],
    emptyTitle: 'Choose a photo with a clear subject',
    emptyDescription: 'We’ll find the focal point and frame it for each format.',
    processing: 'browser',
    icon: Crop,
  },
  {
    id: 'image-rotate',
    section: 'image',
    href: '/image/rotate',
    title: 'Rotate & Flip Image',
    shortTitle: 'Rotate',
    description: 'Turn a photo upright or mirror it, then save it at full resolution.',
    seoTitle: 'Rotate & Flip Image Online — Free, In Your Browser',
    seoDescription:
      'Rotate photos left or right and flip them horizontally or vertically. Saved at full resolution and never uploaded — it all runs in your browser.',
    keywords: ['rotate image', 'flip image', 'mirror image', 'rotate photo', 'turn picture'],
    emptyTitle: 'Choose an image to rotate',
    emptyDescription: 'Turn it, mirror it, then save it at full size.',
    processing: 'browser',
    icon: FlipHorizontal2,
  },
  {
    id: 'image-redact',
    section: 'image',
    href: '/image/redact',
    title: 'Blur & Redact Image',
    shortTitle: 'Redact',
    description: 'Hide faces, names and numbers with a black box, pixelation or blur.',
    seoTitle: 'Blur & Redact Parts of an Image — Private, In Your Browser',
    seoDescription:
      'Draw boxes over faces, license plates, names or numbers and hide them with a solid block, pixelation or blur. The image never leaves your device.',
    keywords: ['blur image', 'redact image', 'pixelate image', 'blur face', 'hide text in screenshot'],
    emptyTitle: 'Choose an image to redact',
    emptyDescription: 'Then draw boxes over anything you want to hide.',
    processing: 'browser',
    icon: EyeOff,
  },
  {
    id: 'image-scrub',
    section: 'image',
    href: '/image/scrub',
    title: 'Remove Metadata',
    shortTitle: 'Scrub',
    description: 'Strip EXIF, GPS location and camera data before you share.',
    seoTitle: 'Remove EXIF & GPS Metadata From Photos',
    seoDescription:
      'Strip EXIF, GPS location and camera details from photos before sharing them. Get a clean copy in seconds.',
    keywords: ['remove exif', 'strip metadata', 'remove gps from photo', 'exif remover'],
    emptyTitle: 'Choose a photo to clean',
    emptyDescription: 'A share-safe copy is ready the moment it uploads.',
    processing: 'server',
    icon: Eraser,
  },
  {
    id: 'image-palette',
    section: 'image',
    href: '/image/palette',
    title: 'Color Palette',
    shortTitle: 'Palette',
    description: 'Pull the dominant colors out of any image as HEX codes.',
    seoTitle: 'Extract a Color Palette From an Image',
    seoDescription:
      'Find the dominant colors in any image and copy them as HEX, RGB or CSS variables. Runs in your browser.',
    keywords: ['color palette from image', 'color picker', 'extract colors', 'hex codes'],
    emptyTitle: 'Choose an image',
    emptyDescription: 'Its dominant colors appear instantly — click one to copy.',
    processing: 'browser',
    icon: Palette,
  },
  {
    id: 'image-favicon',
    section: 'image',
    href: '/image/favicon',
    title: 'Favicon Generator',
    shortTitle: 'Favicon',
    description: 'Every favicon size, an Apple touch icon and favicon.ico from one image.',
    seoTitle: 'Favicon Generator — PNG, ICO & Apple Touch Icon',
    seoDescription:
      'Generate favicon PNGs from 16 to 256px, a multi-size favicon.ico and an Apple touch icon from a single image.',
    keywords: ['favicon generator', 'ico converter', 'apple touch icon', 'favicon.ico'],
    emptyTitle: 'Choose a square logo or icon',
    emptyDescription: 'PNG with transparency works best. We’ll build the whole set.',
    processing: 'server',
    icon: Gem,
  },
  {
    id: 'pdf-merge',
    section: 'pdf',
    href: '/pdf/merge',
    title: 'Merge PDF',
    shortTitle: 'Merge',
    description: 'Combine PDFs into one file, in any order. Bookmarks and links are kept.',
    seoTitle: 'Merge PDF Files — Free, Private, In Your Browser',
    seoDescription:
      'Combine PDFs in any order with drag and drop. Links, form fields and bookmarks are kept. Files never leave your device.',
    keywords: ['merge pdf', 'combine pdf', 'join pdf files'],
    emptyTitle: 'Choose PDFs to merge',
    emptyDescription: 'Add two or more files, then drag them into the order you want.',
    processing: 'browser',
    icon: Layers,
  },
  {
    id: 'pdf-split',
    section: 'pdf',
    href: '/pdf/split',
    title: 'Split PDF',
    shortTitle: 'Split',
    description: 'Cut a PDF into several files — every N pages, or exactly where you choose.',
    seoTitle: 'Split PDF — Every N Pages or Custom Ranges',
    seoDescription:
      'Split a PDF every N pages, at custom ranges, or by clicking between pages. Runs entirely in your browser.',
    keywords: ['split pdf', 'separate pdf pages', 'cut pdf'],
    emptyTitle: 'Choose a PDF to split',
    emptyDescription: 'Preview every page, then cut it into as many files as you need.',
    processing: 'browser',
    icon: SplitSquareHorizontal,
  },
  {
    id: 'pdf-extract',
    section: 'pdf',
    href: '/pdf/extract',
    title: 'Extract Pages',
    shortTitle: 'Extract',
    description: 'Pick pages to save as a new PDF — or remove the ones you don’t want.',
    seoTitle: 'Extract or Remove PDF Pages',
    seoDescription:
      'Select pages to keep or delete by clicking or typing ranges like 1-3, 8, 10-z. Files never leave your device.',
    keywords: ['extract pdf pages', 'remove pdf pages', 'delete pages from pdf'],
    emptyTitle: 'Choose a PDF to extract from',
    emptyDescription: 'Click pages or type ranges like 1-3, 8, 10-z.',
    processing: 'browser',
    icon: FileOutput,
  },
  {
    id: 'pdf-organize',
    section: 'pdf',
    href: '/pdf/organize',
    title: 'Rotate & Reorder Pages',
    shortTitle: 'Organize',
    description: 'Rotate pages and drag them into a new order. Nothing leaves your device.',
    seoTitle: 'Rotate & Reorder PDF Pages — Free, In Your Browser',
    seoDescription:
      'Rotate individual PDF pages or the whole document and drag pages into a new order. Links, forms and bookmarks are kept. Files never leave your device.',
    keywords: ['rotate pdf', 'reorder pdf pages', 'rearrange pdf pages', 'organize pdf'],
    emptyTitle: 'Choose a PDF to organize',
    emptyDescription: 'Preview every page, then rotate or drag pages into the order you want.',
    processing: 'browser',
    icon: RotateCw,
  },
  {
    id: 'pdf-compress',
    section: 'pdf',
    href: '/pdf/compress',
    title: 'Compress PDF',
    shortTitle: 'Compress',
    description: 'Make PDFs smaller while keeping text sharp and searchable.',
    seoTitle: 'Compress PDF — Smaller Files, Sharp Text',
    seoDescription:
      'Shrink PDFs by quality level or to a target size. Text stays sharp and searchable. Runs entirely in your browser.',
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf under 5mb'],
    emptyTitle: 'Choose a PDF to compress',
    emptyDescription: 'Images are re-encoded and fonts trimmed — text stays crisp and selectable.',
    processing: 'browser',
    icon: FileArchive,
  },
];

export function getTool(id: ToolId): Tool {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

export function toolsIn(section: Section): Tool[] {
  return tools.filter((tool) => tool.section === section);
}

export function sectionForPath(pathname: string): Section | null {
  if (pathname.startsWith('/image')) return 'image';
  if (pathname.startsWith('/pdf')) return 'pdf';
  return null;
}
