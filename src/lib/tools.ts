/**
 * Every tool in the app. Navigation, the home page, page headers, SEO and
 * the sitemap all read from this list.
 */
import {
  ArrowRightLeft,
  Crop,
  Eraser,
  EyeOff,
  FileArchive,
  FileOutput,
  FilePenLine,
  FileX2,
  Film,
  FlipHorizontal2,
  Gem,
  IdCard,
  ImageDown,
  ImagePlus,
  Images,
  Layers,
  LayoutGrid,
  Palette,
  PencilLine,
  RotateCw,
  Scaling,
  Signature,
  Sparkles,
  SplitSquareHorizontal,
  Stamp,
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
  | 'image-watermark'
  | 'image-scrub'
  | 'image-palette'
  | 'image-favicon'
  | 'image-convert'
  | 'image-collage'
  | 'image-gif'
  | 'image-passport'
  | 'image-beautify'
  | 'image-annotate'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-extract'
  | 'pdf-organize'
  | 'pdf-compress'
  | 'pdf-from-images'
  | 'pdf-to-images'
  | 'pdf-sign'
  | 'pdf-annotate'
  | 'pdf-redact';

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
    description:
      'Compress, convert, resize, crop, annotate and clean up PNG, JPEG, WebP and HEIC.',
    href: '/image/compress',
  },
  pdf: {
    label: 'PDF',
    title: 'PDF tools',
    description:
      'Merge, split, sign, annotate, redact and compress PDFs — entirely in your browser.',
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
      'Compress up to 10 images at once. Smart presets for PNG, JPEG and WebP, HEIC input supported. Processed in memory and never stored.',
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
    id: 'image-watermark',
    section: 'image',
    href: '/image/watermark',
    title: 'Add Watermark',
    shortTitle: 'Watermark',
    description: 'Stamp text or your logo on a photo — once, or tiled across it.',
    seoTitle: 'Add a Watermark to Photos — Text or Logo, In Your Browser',
    seoDescription:
      'Add a text or logo watermark to your images. Choose size, opacity, position and angle, or tile it across the picture. Runs entirely in your browser.',
    keywords: ['add watermark', 'watermark photo', 'watermark image', 'logo on image', 'text on photo'],
    emptyTitle: 'Choose an image to watermark',
    emptyDescription: 'Add text or a logo, then place it where you want it.',
    processing: 'browser',
    icon: Stamp,
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
      'Find the dominant colors in any image and copy them as HEX, RGB or HSL, or as CSS variables. Runs in your browser.',
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
    id: 'image-convert',
    section: 'image',
    href: '/image/convert',
    title: 'Convert Image Format',
    shortTitle: 'Convert',
    description: 'Turn HEIC, PNG, JPEG and WebP into JPG, PNG or WebP — in one batch.',
    seoTitle: 'Convert Images — HEIC to JPG, PNG to WebP and More',
    seoDescription:
      'Convert HEIC to JPG, PNG to WebP, WebP to PNG and more. Up to 10 images at once at full quality, processed in memory and never stored.',
    keywords: ['heic to jpg', 'convert image', 'png to webp', 'webp to png', 'image converter'],
    emptyTitle: 'Drop images to convert',
    emptyDescription: 'HEIC from an iPhone, PNG, JPEG or WebP. Pick the format after.',
    processing: 'server',
    icon: ArrowRightLeft,
  },
  {
    id: 'image-collage',
    section: 'image',
    href: '/image/collage',
    title: 'Collage Maker',
    shortTitle: 'Collage',
    description: 'Arrange photos in a grid with spacing, rounded corners and a background.',
    seoTitle: 'Photo Collage Maker — Grids, Spacing & Backgrounds',
    seoDescription:
      'Combine photos into a single image with grid layouts, spacing, rounded corners and a background colour. Runs in your browser — nothing is uploaded.',
    keywords: ['collage maker', 'photo grid', 'combine images', 'photo collage', 'merge photos'],
    emptyTitle: 'Choose photos for your collage',
    emptyDescription: 'Add 2 to 12 photos, then pick a layout.',
    processing: 'browser',
    icon: LayoutGrid,
  },
  {
    id: 'image-gif',
    section: 'image',
    href: '/image/gif',
    title: 'GIF Maker',
    shortTitle: 'GIF',
    description: 'Turn a set of images into an animated GIF with the timing you choose.',
    seoTitle: 'GIF Maker — Make an Animated GIF From Images',
    seoDescription:
      'Make an animated GIF from several images. Reorder frames, set the speed and size, and loop it. Runs in your browser — nothing is uploaded.',
    keywords: ['gif maker', 'images to gif', 'animated gif', 'create gif', 'photo to gif'],
    emptyTitle: 'Choose the frames for your GIF',
    emptyDescription: 'Add 2 to 40 images in the order they should play.',
    processing: 'browser',
    icon: Film,
  },
  {
    id: 'image-passport',
    section: 'image',
    href: '/image/passport',
    title: 'Passport Photo Maker',
    shortTitle: 'Passport',
    description: 'Crop to official passport and ID sizes and lay out a ready-to-print sheet.',
    seoTitle: 'Passport Photo Maker — Crop to Size & Print Sheet',
    seoDescription:
      'Crop a photo to US, EU, UK, India and other passport and ID sizes at 300 dpi, then download a 4×6 or A4 sheet ready to print. Runs in your browser.',
    keywords: ['passport photo', 'id photo maker', 'passport size photo', 'visa photo', 'photo 2x2'],
    emptyTitle: 'Choose a front-facing photo',
    emptyDescription: 'Plain light background, head straight on. Then pick a country and size.',
    processing: 'browser',
    icon: IdCard,
  },
  {
    id: 'image-beautify',
    section: 'image',
    href: '/image/beautify',
    title: 'Screenshot Beautifier',
    shortTitle: 'Beautify',
    description: 'Frame screenshots with a gradient, padding, rounded corners and a soft shadow.',
    seoTitle: 'Screenshot Beautifier — Backgrounds, Shadows & Frames',
    seoDescription:
      'Make screenshots look polished: add a gradient background, padding, rounded corners, a shadow and an optional window bar. Runs in your browser.',
    keywords: ['screenshot beautifier', 'screenshot mockup', 'screenshot background', 'beautify screenshot'],
    emptyTitle: 'Choose a screenshot',
    emptyDescription: 'We’ll frame it with a background, shadow and rounded corners.',
    processing: 'browser',
    icon: Sparkles,
  },
  {
    id: 'image-annotate',
    section: 'image',
    href: '/image/annotate',
    title: 'Annotate Image',
    shortTitle: 'Annotate',
    description: 'Add arrows, boxes, text and numbered steps to screenshots and photos.',
    seoTitle: 'Annotate Screenshots — Arrows, Boxes, Text & Steps',
    seoDescription:
      'Mark up a screenshot or photo with arrows, rectangles, highlights, text, numbered steps and freehand drawing. Runs in your browser — nothing is uploaded.',
    keywords: ['annotate screenshot', 'add arrows to image', 'markup image', 'add text to image'],
    emptyTitle: 'Choose an image to mark up',
    emptyDescription: 'Then add arrows, boxes, text and numbered steps.',
    processing: 'browser',
    icon: PencilLine,
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
  {
    id: 'pdf-from-images',
    section: 'pdf',
    href: '/pdf/from-images',
    title: 'Images to PDF',
    shortTitle: 'From images',
    description: 'Combine photos and scans into one PDF — choose page size, margins and order.',
    seoTitle: 'Images to PDF — JPG, PNG & WebP to One PDF',
    seoDescription:
      'Turn JPG, PNG, WebP and other images into a single PDF. Reorder pages, pick A4, Letter or fit-to-image, and set margins. Files never leave your device.',
    keywords: ['jpg to pdf', 'image to pdf', 'png to pdf', 'photos to pdf', 'scan to pdf'],
    emptyTitle: 'Choose images to turn into a PDF',
    emptyDescription: 'Add photos or scans, then drag them into page order.',
    processing: 'browser',
    icon: ImagePlus,
  },
  {
    id: 'pdf-to-images',
    section: 'pdf',
    href: '/pdf/to-images',
    title: 'PDF to Images',
    shortTitle: 'To images',
    description: 'Save PDF pages as sharp PNG or JPG images, all or just the ones you pick.',
    seoTitle: 'PDF to JPG & PNG — Export Pages as Images',
    seoDescription:
      'Convert PDF pages to PNG or JPG at up to 300 dpi. Export every page or a range, as a ZIP. Runs entirely in your browser.',
    keywords: ['pdf to jpg', 'pdf to png', 'convert pdf to image', 'export pdf pages'],
    emptyTitle: 'Choose a PDF to export',
    emptyDescription: 'Each page becomes an image you can download.',
    processing: 'browser',
    icon: Images,
  },
  {
    id: 'pdf-sign',
    section: 'pdf',
    href: '/pdf/sign',
    title: 'Sign PDF',
    shortTitle: 'Sign',
    description: 'Draw, type or upload your signature and place it anywhere on a page.',
    seoTitle: 'Sign PDF Online — Draw, Type or Upload Your Signature',
    seoDescription:
      'Sign a PDF by drawing, typing or uploading your signature, then drag it into place and resize it. Your document never leaves your device.',
    keywords: ['sign pdf', 'esign pdf', 'add signature to pdf', 'electronic signature'],
    emptyTitle: 'Choose a PDF to sign',
    emptyDescription: 'Create your signature, then drop it on the page.',
    processing: 'browser',
    icon: Signature,
  },
  {
    id: 'pdf-annotate',
    section: 'pdf',
    href: '/pdf/annotate',
    title: 'Fill & Annotate PDF',
    shortTitle: 'Annotate',
    description: 'Type into forms, tick boxes, highlight and draw shapes on any PDF.',
    seoTitle: 'Fill & Annotate PDF — Text, Checkmarks, Highlights',
    seoDescription:
      'Add text, checkmarks, highlights, rectangles, ellipses, arrows and lines to a PDF. Fill out a form that has no fields. Runs entirely in your browser.',
    keywords: ['fill pdf', 'annotate pdf', 'edit pdf', 'add text to pdf', 'highlight pdf'],
    emptyTitle: 'Choose a PDF to fill or mark up',
    emptyDescription: 'Click to add text and checkmarks, drag to highlight or draw.',
    processing: 'browser',
    icon: FilePenLine,
  },
  {
    id: 'pdf-redact',
    section: 'pdf',
    href: '/pdf/redact',
    title: 'Redact PDF',
    shortTitle: 'Redact',
    description: 'Permanently remove text and images under black boxes — not just cover them.',
    seoTitle: 'Redact PDF — Permanently Remove Sensitive Text',
    seoDescription:
      'Draw boxes over names, numbers and images in a PDF and remove what is underneath for good. The text is deleted from the file, not just hidden. Runs in your browser.',
    keywords: ['redact pdf', 'blackout pdf', 'remove text from pdf', 'censor pdf'],
    emptyTitle: 'Choose a PDF to redact',
    emptyDescription: 'Draw boxes over what to hide. It’s removed from the file for good.',
    processing: 'browser',
    icon: FileX2,
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
