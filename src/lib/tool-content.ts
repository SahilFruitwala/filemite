/**
 * Answer-first copy for every tool page: a one-paragraph summary, the steps, and the
 * questions people actually search for. It is rendered as visible page content and
 * mirrored into FAQPage structured data, so search engines and AI answer engines can
 * quote it. Claims here must match what the tool really does.
 */
import { formatBytes } from './format';
import { IMAGES_PER_HOUR, MAX_IMAGE_BATCH, MAX_IMAGE_BYTES } from './limits';
import type { ToolId } from './tools';

export type Faq = { question: string; answer: string };

export type ToolContent = {
  /** Two or three sentences that answer "what is this and is it safe" on their own. */
  summary: string;
  steps: string[];
  faqs: Faq[];
};

const NO_UPLOAD = 'No. Everything runs in your browser, so the file never leaves your device.';
const IN_MEMORY = `Images are processed in memory on the server and discarded as soon as you have the result. They are never written to disk or kept. You can process up to ${MAX_IMAGE_BATCH} images per batch, ${formatBytes(MAX_IMAGE_BYTES)} each, and ${IMAGES_PER_HOUR} per hour.`;

export const toolContent: Record<ToolId, ToolContent> = {
  'image-compress': {
    summary: `Filemite compresses PNG, JPEG, WebP and HEIC images for free, with no sign-up and no watermark. Pick a preset, drop in up to ${MAX_IMAGE_BATCH} images, and download smaller files that look the same. Images are processed in memory and never stored.`,
    steps: [
      'Drop your images onto the page, or choose them from your device.',
      'Pick a compression preset and check the before and after size.',
      'Download each compressed image, or all of them together.',
    ],
    faqs: [
      {
        question: 'How do I reduce the size of an image without losing quality?',
        answer:
          'Use a preset that keeps the same format, such as a balanced JPEG or WebP setting. Filemite shows the original and compressed sizes side by side so you can pick the smallest file that still looks right.',
      },
      {
        question: 'Does Filemite store my images?',
        answer: IN_MEMORY,
      },
      {
        question: 'Can I compress HEIC photos from my iPhone?',
        answer: 'Yes. HEIC and HEIF files are accepted as input and can be saved as JPEG, PNG or WebP.',
      },
    ],
  },
  'image-resize': {
    summary:
      'Filemite resizes images to exact pixel dimensions or to ready-made social media presets, for free. Choose cover, contain, fill or fit-inside, and download the result. Images are processed in memory and never stored.',
    steps: [
      'Add the image you want to resize.',
      'Enter a width and height, or pick a preset for social media or the web.',
      'Choose how the image should fit, then download the resized file.',
    ],
    faqs: [
      {
        question: 'How do I resize an image to an exact size in pixels?',
        answer:
          'Enter the width and height you need and choose a fit mode. Cover fills the frame and crops the overflow, contain fits the whole image inside it, fill stretches it, and fit-inside shrinks it to stay within the size.',
      },
      {
        question: 'Does resizing upload my image?',
        answer: IN_MEMORY,
      },
    ],
  },
  'image-crop': {
    summary:
      'Filemite finds the subject of a photo and suggests a crop for square posts, stories and link previews. You can adjust the crop before you save. It runs in your browser, so the photo is never uploaded.',
    steps: [
      'Add a photo.',
      'Pick a target shape such as square, story or link preview.',
      'Accept the suggested crop or adjust it, then download the cropped image.',
    ],
    faqs: [
      {
        question: 'How does smart crop decide what to keep?',
        answer:
          'It looks for the most important part of the picture, such as faces, edges and detail, and centers the crop on it. You can always move or resize the crop yourself.',
      },
      { question: 'Is my photo uploaded when I crop it?', answer: NO_UPLOAD },
    ],
  },
  'image-rotate': {
    summary:
      'Filemite rotates photos left or right and flips them horizontally or vertically, then saves them at full resolution. It runs in your browser, so the photo is never uploaded.',
    steps: [
      'Add a photo.',
      'Rotate it left or right, or flip it horizontally or vertically.',
      'Download the corrected image.',
    ],
    faqs: [
      {
        question: 'How do I fix a photo that is sideways or upside down?',
        answer:
          'Add the photo, rotate it in 90 degree steps until it is upright, and save it. The saved file is rotated for real, so it looks right in every app.',
      },
      { question: 'Does rotating lower the quality of my photo?', answer: 'The result is saved at full resolution. ' + NO_UPLOAD },
    ],
  },
  'image-redact': {
    summary:
      'Filemite hides faces, license plates, names and numbers in an image with a solid block, pixelation or blur. Draw a box over each area and download the result. It runs in your browser, so the image never leaves your device.',
    steps: [
      'Add the image.',
      'Draw a box over each face, name or number you want to hide.',
      'Choose a solid block, pixelation or blur, then download the image.',
    ],
    faqs: [
      {
        question: 'How do I blur a face or text in a screenshot?',
        answer:
          'Add the screenshot, draw a box over the area, choose blur, and save. For sensitive text, a solid black block or heavy pixelation is safer than a light blur.',
      },
      { question: 'Is my image uploaded to hide parts of it?', answer: NO_UPLOAD },
    ],
  },
  'image-watermark': {
    summary:
      'Filemite adds a text or logo watermark to your photos, once or tiled across the picture. You control size, opacity, position and angle. It runs in your browser, so nothing is uploaded.',
    steps: [
      'Add a photo.',
      'Type your text or upload a logo.',
      'Set the size, opacity, position and angle, then download the watermarked image.',
    ],
    faqs: [
      {
        question: 'How do I add a watermark to a photo for free?',
        answer:
          'Add the photo, enter text or upload a logo, adjust the opacity and position, and save. Filemite does not add its own watermark.',
      },
      { question: 'Can I tile a watermark across the whole image?', answer: 'Yes. Switch to a tiled layout to repeat the watermark across the picture and set the angle you want.' },
    ],
  },
  'image-scrub': {
    summary: `Filemite removes EXIF data, GPS location and camera details from photos so you can share them without giving away where they were taken. Images are processed in memory and never stored.`,
    steps: [
      'Add the photos you want to clean.',
      'Run the metadata removal.',
      'Download the clean copies. Your originals are not changed.',
    ],
    faqs: [
      {
        question: 'How do I remove location data from a photo?',
        answer:
          'Add the photo to Filemite and download the cleaned copy. The GPS coordinates, camera model, timestamps and other EXIF fields are stripped from the new file.',
      },
      {
        question: 'Does Filemite keep my photos?',
        answer: IN_MEMORY,
      },
    ],
  },
  'image-palette': {
    summary:
      'Filemite finds the dominant colors in any image and lets you copy them as HEX, RGB or CSS variables. It runs in your browser, so the image is never uploaded.',
    steps: ['Add an image.', 'Review the extracted colors.', 'Copy the format you need: HEX, RGB or CSS variables.'],
    faqs: [
      {
        question: 'How do I get the HEX codes of the colors in a picture?',
        answer: 'Add the picture and Filemite lists its dominant colors with their HEX codes. Click a color to copy it.',
      },
      { question: 'Is my image uploaded to find its colors?', answer: NO_UPLOAD },
    ],
  },
  'image-favicon': {
    summary: `Filemite turns one image into a full favicon set: PNGs from 16 to 256 pixels, a multi-size favicon.ico and an Apple touch icon. Images are processed in memory and never stored.`,
    steps: [
      'Add a square logo or icon image.',
      'Generate the favicon set.',
      'Download the files and add them to your site.',
    ],
    faqs: [
      {
        question: 'What sizes does a favicon need?',
        answer:
          'A favicon.ico containing 16, 32 and 48 pixel icons covers browsers, and an Apple touch icon covers iPhone and iPad home screens. Filemite creates these and PNGs up to 256 pixels in one go.',
      },
      {
        question: 'Does Filemite keep my logo?',
        answer: IN_MEMORY,
      },
    ],
  },
  'image-convert': {
    summary: `Filemite converts HEIC to JPG, PNG to WebP, WebP to PNG and more, up to ${MAX_IMAGE_BATCH} images at a time. Images are processed in memory and never stored.`,
    steps: [
      'Add your images. HEIC, PNG, JPEG and WebP are accepted.',
      'Choose JPG, PNG or WebP as the output format.',
      'Download the converted images.',
    ],
    faqs: [
      {
        question: 'How do I convert HEIC to JPG?',
        answer:
          'Add the HEIC photos, choose JPG as the output format, and download the converted files. This works with photos taken on an iPhone.',
      },
      {
        question: 'Which formats can I convert between?',
        answer: 'You can convert HEIC, PNG, JPEG and WebP into JPG, PNG or WebP.',
      },
      {
        question: 'Does Filemite store my images?',
        answer: IN_MEMORY,
      },
    ],
  },
  'image-collage': {
    summary:
      'Filemite combines photos into a single image using grid layouts, with spacing, rounded corners and a background color you choose. It runs in your browser, so nothing is uploaded.',
    steps: ['Add your photos.', 'Pick a grid layout and adjust spacing, corners and background.', 'Download the collage.'],
    faqs: [
      {
        question: 'How do I put several photos into one image?',
        answer: 'Add the photos, choose a grid layout, and download the combined image.',
      },
      { question: 'Are my photos uploaded to make a collage?', answer: NO_UPLOAD },
    ],
  },
  'image-gif': {
    summary:
      'Filemite makes an animated GIF from a set of images. Reorder the frames, set the speed and size, and choose whether it loops. It runs in your browser, so nothing is uploaded.',
    steps: ['Add the images that will be your frames.', 'Reorder them and set the speed, size and looping.', 'Download the GIF.'],
    faqs: [
      {
        question: 'How do I make a GIF from photos?',
        answer: 'Add the photos in the order you want, set the delay between frames, and download the animated GIF.',
      },
      { question: 'Are my images uploaded to make the GIF?', answer: NO_UPLOAD },
    ],
  },
  'image-passport': {
    summary:
      'Filemite crops a photo to passport and ID sizes for the US, EU, UK, India and other places at 300 dpi, then lays out a 4×6 or A4 sheet ready to print. It runs in your browser, so your photo is never uploaded.',
    steps: [
      'Add a portrait photo.',
      'Choose the country or ID size and position your face in the guide.',
      'Download the single photo or a print-ready 4×6 or A4 sheet.',
    ],
    faqs: [
      {
        question: 'How do I make a passport photo at home?',
        answer:
          'Take a front-facing photo against a plain background, choose your country in Filemite, adjust the crop, and print the sheet on photo paper. Check your issuing authority’s rules for background and expression.',
      },
      { question: 'Is my photo uploaded?', answer: NO_UPLOAD },
    ],
  },
  'image-beautify': {
    summary:
      'Filemite makes screenshots look polished with a gradient background, padding, rounded corners, a shadow and an optional window bar. It runs in your browser, so nothing is uploaded.',
    steps: ['Add a screenshot.', 'Choose a background, padding, corners and shadow.', 'Download the framed image.'],
    faqs: [
      {
        question: 'How do I add a background to a screenshot?',
        answer: 'Add the screenshot, pick a gradient, set the padding and corner radius, and download the new image.',
      },
      { question: 'Is my screenshot uploaded?', answer: NO_UPLOAD },
    ],
  },
  'image-annotate': {
    summary:
      'Filemite marks up screenshots and photos with arrows, rectangles, highlights, text, numbered steps and freehand drawing. It runs in your browser, so nothing is uploaded.',
    steps: ['Add a screenshot or photo.', 'Pick a tool and draw or type on the image.', 'Download the annotated image.'],
    faqs: [
      {
        question: 'How do I add arrows and text to a screenshot?',
        answer: 'Add the screenshot, choose the arrow or text tool, click where you want it, and download the result.',
      },
      { question: 'Is my screenshot uploaded?', answer: NO_UPLOAD },
    ],
  },
  'pdf-merge': {
    summary:
      'Filemite merges PDFs into one file, in any order you choose. Links, form fields and bookmarks are kept. Files are processed on your device and never uploaded.',
    steps: [
      'Add the PDFs you want to combine.',
      'Drag them into the order you need.',
      'Download the merged PDF.',
    ],
    faqs: [
      {
        question: 'How do I combine PDF files for free?',
        answer: 'Add the PDFs, drag them into order, and download one merged file. There is no sign-up and no watermark.',
      },
      {
        question: 'Are my PDFs uploaded when I merge them?',
        answer: 'No. Merging runs in your browser, so your documents never leave your device.',
      },
    ],
  },
  'pdf-split': {
    summary:
      'Filemite splits a PDF every N pages, at custom page ranges, or wherever you click between pages. It runs in your browser, so your document is never uploaded.',
    steps: ['Add the PDF.', 'Choose how to split it: every N pages, custom ranges, or between pages.', 'Download the new files.'],
    faqs: [
      {
        question: 'How do I split a PDF into separate files?',
        answer: 'Add the PDF and choose a split rule, such as every 5 pages or ranges like 1-3, 4-8. Then download the results.',
      },
      { question: 'Is my PDF uploaded?', answer: 'No. Splitting runs in your browser and the PDF never leaves your device.' },
    ],
  },
  'pdf-extract': {
    summary:
      'Filemite saves selected pages of a PDF as a new file, or removes the pages you do not want. Select pages by clicking or by typing ranges. It runs in your browser, so your document is never uploaded.',
    steps: [
      'Add the PDF.',
      'Click the pages to keep or delete, or type ranges such as 1-3, 8, 10-z.',
      'Download the new PDF.',
    ],
    faqs: [
      {
        question: 'How do I delete pages from a PDF?',
        answer: 'Add the PDF, select the pages to remove, and download the result. The original file is not changed.',
      },
      { question: 'Is my PDF uploaded?', answer: 'No. This runs in your browser and the PDF never leaves your device.' },
    ],
  },
  'pdf-organize': {
    summary:
      'Filemite rotates individual PDF pages or the whole document and lets you drag pages into a new order. Links, forms and bookmarks are kept. It runs in your browser, so your document is never uploaded.',
    steps: ['Add the PDF.', 'Rotate pages and drag them into the order you want.', 'Download the reorganized PDF.'],
    faqs: [
      {
        question: 'How do I rotate one page of a PDF?',
        answer: 'Add the PDF, rotate just that page, and save. You can also rotate every page at once.',
      },
      { question: 'Is my PDF uploaded?', answer: 'No. This runs in your browser and the PDF never leaves your device.' },
    ],
  },
  'pdf-compress': {
    summary:
      'Filemite makes PDFs smaller by quality level or to a target size, while keeping text sharp and searchable. It runs in your browser, so your document is never uploaded.',
    steps: [
      'Add the PDF.',
      'Pick a quality level or a target size.',
      'Download the smaller PDF and check the size saved.',
    ],
    faqs: [
      {
        question: 'How do I reduce the size of a PDF?',
        answer: 'Add the PDF and choose a quality level or a target size. Filemite shrinks the images inside and keeps the text sharp and searchable.',
      },
      {
        question: 'Is it safe to compress a confidential PDF here?',
        answer: 'Yes. Compression runs in your browser, so contracts, IDs and other sensitive PDFs are never uploaded.',
      },
    ],
  },
  'pdf-from-images': {
    summary:
      'Filemite turns JPG, PNG, WebP and other images into a single PDF. Reorder the pages, pick A4, Letter or fit-to-image, and set margins. It runs in your browser, so your files are never uploaded.',
    steps: ['Add your images or scans.', 'Reorder them and choose the page size and margins.', 'Download the PDF.'],
    faqs: [
      {
        question: 'How do I convert JPG to PDF?',
        answer: 'Add the JPG files, put them in order, choose a page size, and download one PDF.',
      },
      { question: 'Are my images uploaded?', answer: NO_UPLOAD },
    ],
  },
  'pdf-to-images': {
    summary:
      'Filemite saves PDF pages as PNG or JPG images at up to 300 dpi. Export every page or a range, delivered as a ZIP. It runs in your browser, so your document is never uploaded.',
    steps: ['Add the PDF.', 'Choose PNG or JPG, the resolution, and which pages to export.', 'Download the images as a ZIP.'],
    faqs: [
      {
        question: 'How do I convert a PDF to JPG?',
        answer: 'Add the PDF, choose JPG, pick the pages and resolution, and download the images as a ZIP.',
      },
      { question: 'Is my PDF uploaded?', answer: 'No. This runs in your browser and the PDF never leaves your device.' },
    ],
  },
  'pdf-sign': {
    summary:
      'Filemite signs a PDF by drawing, typing or uploading your signature, which you then drag into place and resize. Your document is never uploaded.',
    steps: [
      'Add the PDF.',
      'Draw, type or upload your signature.',
      'Drag it onto the page, resize it, and download the signed PDF.',
    ],
    faqs: [
      {
        question: 'How do I sign a PDF without printing it?',
        answer: 'Add the PDF, create your signature by drawing, typing or uploading an image, place it on the page, and download the signed file.',
      },
      {
        question: 'Is it safe to sign a contract here?',
        answer: 'Your document is processed in your browser and never uploaded. Note that this adds a visual signature and is not a certificate-based digital signature.',
      },
    ],
  },
  'pdf-annotate': {
    summary:
      'Filemite adds text, checkmarks, highlights, rectangles, ellipses, arrows and lines to a PDF, so you can fill out a form even when it has no form fields. It runs in your browser, so your document is never uploaded.',
    steps: ['Add the PDF.', 'Pick a tool and click on the page to type or draw.', 'Download the annotated PDF.'],
    faqs: [
      {
        question: 'How do I fill out a PDF form that has no fillable fields?',
        answer: 'Add the PDF, use the text tool to type onto the page where each answer goes, tick boxes with the checkmark tool, and save.',
      },
      { question: 'Is my PDF uploaded?', answer: 'No. This runs in your browser and the PDF never leaves your device.' },
    ],
  },
  'pdf-redact': {
    summary:
      'Filemite permanently removes the text and images under black boxes you draw on a PDF. The content is deleted from the file, not just covered. It runs in your browser, so your document is never uploaded.',
    steps: [
      'Add the PDF.',
      'Draw boxes over the names, numbers or images to remove.',
      'Download the redacted PDF, where the covered content is gone for good.',
    ],
    faqs: [
      {
        question: 'How do I redact a PDF properly?',
        answer: 'Use a tool that deletes the content under the box instead of drawing a shape over it. Filemite removes the underlying text and images from the file, so they cannot be copied or recovered.',
      },
      {
        question: 'Why is a black rectangle not enough to hide text in a PDF?',
        answer: 'A shape drawn on top leaves the original text in the file, where it can still be selected, copied or extracted. Real redaction removes it.',
      },
      { question: 'Is my PDF uploaded?', answer: 'No. This runs in your browser and the PDF never leaves your device.' },
    ],
  },
};

/** Questions that apply to the whole product, shown on the home page. */
export const siteFaqs: Faq[] = [
  {
    question: 'What is Filemite?',
    answer:
      'Filemite is a free website with small, focused tools for images and PDFs: compress, convert, resize, crop, redact and annotate images, and merge, split, sign, redact and compress PDFs. There is no sign-up and no watermark.',
  },
  {
    question: 'Is Filemite really free?',
    answer: 'Yes. Every tool is free to use without an account, and Filemite does not add watermarks to your files.',
  },
  {
    question: 'Are my files uploaded or stored?',
    answer:
      'PDF tools and most image tools run entirely in your browser, so those files never leave your device. The compress, convert, resize, metadata removal and favicon tools process images in memory on the server and discard them immediately. Nothing is stored.',
  },
  {
    question: 'Is Filemite safe for sensitive documents?',
    answer:
      'PDF tools, including sign and redact, run on your device, so contracts, IDs and financial documents are never uploaded.',
  },
  {
    question: 'Is there a file size limit?',
    answer: `PDFs can be up to 250 MB each. Images that go through the server are limited to ${MAX_IMAGE_BATCH} per batch, ${formatBytes(MAX_IMAGE_BYTES)} each and ${IMAGES_PER_HOUR} per hour, to keep the service fast for everyone.`,
  },
  {
    question: 'Is the source code available?',
    answer: 'Yes. Filemite is open source under the AGPL-3.0 license on GitHub.',
  },
];
