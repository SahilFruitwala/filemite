/** Layout and painting for the Screenshot Beautifier. */

export type Backdrop =
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | { kind: 'solid'; color: string }
  | { kind: 'none' };

export const BACKDROPS: { id: string; label: string; backdrop: Backdrop }[] = [
  { id: 'sunset', label: 'Sunset', backdrop: { kind: 'gradient', from: '#ff9a62', to: '#ff4d8d', angle: 135 } },
  { id: 'ocean', label: 'Ocean', backdrop: { kind: 'gradient', from: '#43c6ff', to: '#3a5bff', angle: 135 } },
  { id: 'meadow', label: 'Meadow', backdrop: { kind: 'gradient', from: '#a8e063', to: '#1fa37a', angle: 135 } },
  { id: 'grape', label: 'Grape', backdrop: { kind: 'gradient', from: '#a18cff', to: '#5b3df5', angle: 135 } },
  { id: 'peach', label: 'Peach', backdrop: { kind: 'gradient', from: '#ffe3c7', to: '#ffb5a7', angle: 135 } },
  { id: 'midnight', label: 'Midnight', backdrop: { kind: 'gradient', from: '#2b3556', to: '#0b0f1f', angle: 160 } },
  { id: 'mist', label: 'Mist', backdrop: { kind: 'gradient', from: '#f3f4f8', to: '#d9dcea', angle: 135 } },
  { id: 'white', label: 'White', backdrop: { kind: 'solid', color: '#ffffff' } },
  { id: 'none', label: 'Transparent', backdrop: { kind: 'none' } },
];

export type Frame = 'none' | 'light' | 'dark';

export const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: 'auto', label: 'Auto', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
];

export type BeautifyOptions = {
  /** Space around the screenshot, as a percentage of its longer side. */
  padding: number;
  /** Corner radius, as a percentage of the window's shorter side. */
  radius: number;
  /** 0–100. */
  shadow: number;
  frame: Frame;
  /** Width ÷ height of the finished picture, or null to size it to fit. */
  aspect: number | null;
};

export const DEFAULT_BEAUTIFY: BeautifyOptions = {
  padding: 8,
  radius: 2.5,
  shadow: 55,
  frame: 'none',
  aspect: null,
};

type Box = { x: number; y: number; width: number; height: number };

export type BeautifyLayout = {
  width: number;
  height: number;
  /** The rounded window: the screenshot plus the title bar, if any. */
  window: Box;
  image: Box;
  bar: Box | null;
  radius: number;
  shadow: { blur: number; offsetY: number; alpha: number };
};

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

export function beautifyLayout(
  imageWidth: number,
  imageHeight: number,
  options: BeautifyOptions,
): BeautifyLayout {
  const pad = Math.round((options.padding / 100) * Math.max(imageWidth, imageHeight));
  const barHeight = options.frame === 'none' ? 0 : Math.round(clamp(imageWidth * 0.04, 24, 72));
  const windowWidth = imageWidth;
  const windowHeight = imageHeight + barHeight;

  let width = windowWidth + pad * 2;
  let height = windowHeight + pad * 2;
  if (options.aspect) {
    if (width / height < options.aspect) width = Math.ceil(height * options.aspect);
    else height = Math.ceil(width / options.aspect);
  }

  const x = Math.round((width - windowWidth) / 2);
  const y = Math.round((height - windowHeight) / 2);
  const strength = clamp(options.shadow, 0, 100) / 100;
  const blur = Math.round(strength * Math.max(windowWidth, windowHeight) * 0.07);

  return {
    width,
    height,
    window: { x, y, width: windowWidth, height: windowHeight },
    image: { x, y: y + barHeight, width: imageWidth, height: imageHeight },
    bar: barHeight ? { x, y, width: windowWidth, height: barHeight } : null,
    radius: Math.round((clamp(options.radius, 0, 20) / 100) * Math.min(windowWidth, windowHeight)),
    shadow: { blur, offsetY: Math.round(blur * 0.4), alpha: strength ? 0.18 + 0.32 * strength : 0 },
  };
}

/** The scale that keeps a canvas within browser limits (longest side and pixel count). */
export function exportScale(width: number, height: number, maxSide = 8192, maxPixels = 50_000_000) {
  return Math.min(1, maxSide / Math.max(width, height), Math.sqrt(maxPixels / (width * height)));
}

function roundedRect(context: CanvasRenderingContext2D, box: Box, radius: number) {
  const r = Math.min(radius, box.width / 2, box.height / 2);
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, r);
}

function paintBackdrop(context: CanvasRenderingContext2D, backdrop: Backdrop, width: number, height: number) {
  if (backdrop.kind === 'none') return;
  if (backdrop.kind === 'solid') {
    context.fillStyle = backdrop.color;
  } else {
    // CSS-style angle: 180° runs top to bottom, 90° left to right.
    const radians = ((backdrop.angle - 90) * Math.PI) / 180;
    const half = (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * height) / 2;
    const cx = width / 2;
    const cy = height / 2;
    const gradient = context.createLinearGradient(
      cx - Math.cos(radians) * half,
      cy - Math.sin(radians) * half,
      cx + Math.cos(radians) * half,
      cy + Math.sin(radians) * half,
    );
    gradient.addColorStop(0, backdrop.from);
    gradient.addColorStop(1, backdrop.to);
    context.fillStyle = gradient;
  }
  context.fillRect(0, 0, width, height);
}

/** Paints the finished picture onto a context already sized to `layout` × `scale`. */
export function paintBeautified(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  layout: BeautifyLayout,
  options: BeautifyOptions,
  backdrop: Backdrop,
  scale = 1,
) {
  context.save();
  context.scale(scale, scale);
  context.clearRect(0, 0, layout.width, layout.height);
  paintBackdrop(context, backdrop, layout.width, layout.height);

  // Shadow first, from a solid shape, so the screenshot's own transparency isn't shadowed twice.
  if (layout.shadow.alpha > 0) {
    context.save();
    context.shadowColor = `rgb(0 0 0 / ${layout.shadow.alpha})`;
    context.shadowBlur = layout.shadow.blur * scale;
    context.shadowOffsetY = layout.shadow.offsetY * scale;
    context.fillStyle = options.frame === 'dark' ? '#1e1f24' : '#ffffff';
    // Shadow offsets ignore the transform, hence the manual scaling above.
    roundedRect(context, layout.window, layout.radius);
    context.fill();
    context.restore();
  }

  context.save();
  roundedRect(context, layout.window, layout.radius);
  context.clip();
  context.fillStyle = options.frame === 'dark' ? '#1e1f24' : '#ffffff';
  context.fillRect(layout.window.x, layout.window.y, layout.window.width, layout.window.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, layout.image.x, layout.image.y, layout.image.width, layout.image.height);

  if (layout.bar) {
    const { x, y, width, height } = layout.bar;
    const dark = options.frame === 'dark';
    context.fillStyle = dark ? '#2b2d33' : '#ecedf0';
    context.fillRect(x, y, width, height);
    context.fillStyle = dark ? '#3a3c44' : '#d7d9de';
    context.fillRect(x, y + height - 1, width, 1);
    const dot = height * 0.16;
    ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(x + height * 0.55 + index * dot * 3, y + height / 2, dot, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.restore();
  context.restore();
}
