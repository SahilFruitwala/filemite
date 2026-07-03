/**
 * Client-side watermarking with canvas. Runs entirely in the browser —
 * images never leave the device.
 */

export interface WatermarkOptions {
  type: 'text' | 'image';
  text?: string;
  image?: File | null;
  /** 0-100 */
  opacity: number;
  /** sharp-style gravity, or 'tile' */
  position: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function placement(
  gravity: string,
  mainW: number,
  mainH: number,
  markW: number,
  markH: number,
  margin: number,
): { x: number; y: number } {
  const left = margin;
  const right = mainW - markW - margin;
  const top = margin;
  const bottom = mainH - markH - margin;
  const centerX = (mainW - markW) / 2;
  const centerY = (mainH - markH) / 2;
  switch (gravity) {
    case 'north':
      return { x: centerX, y: top };
    case 'south':
      return { x: centerX, y: bottom };
    case 'east':
      return { x: right, y: centerY };
    case 'west':
      return { x: left, y: centerY };
    case 'northeast':
      return { x: right, y: top };
    case 'northwest':
      return { x: left, y: top };
    case 'southwest':
      return { x: left, y: bottom };
    case 'center':
      return { x: centerX, y: centerY };
    case 'southeast':
    default:
      return { x: right, y: bottom };
  }
}

export async function applyWatermark(
  file: File,
  options: WatermarkOptions,
): Promise<Blob> {
  const mainImage = await loadImage(URL.createObjectURL(file));
  const canvas = document.createElement('canvas');
  canvas.width = mainImage.naturalWidth;
  canvas.height = mainImage.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(mainImage, 0, 0);
  const alpha = Math.min(1, Math.max(0, options.opacity / 100));
  const margin = Math.round(canvas.width * 0.02);

  if (options.type === 'text' && options.text) {
    const fontSize = Math.max(16, Math.floor(canvas.width * 0.05));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(options.text);
    const markW = metrics.width;
    const markH = fontSize * 1.2;

    const drawText = (x: number, y: number) => {
      ctx.globalAlpha = Math.max(0, alpha - 0.2);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.max(1, fontSize / 24);
      ctx.strokeText(options.text!, x, y);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'white';
      ctx.fillText(options.text!, x, y);
    };

    if (options.position === 'tile') {
      const stepX = markW + canvas.width * 0.1;
      const stepY = markH + canvas.height * 0.1;
      for (let y = 0; y < canvas.height; y += stepY) {
        for (let x = 0; x < canvas.width; x += stepX) {
          drawText(x, y);
        }
      }
    } else {
      const { x, y } = placement(options.position, canvas.width, canvas.height, markW, markH, margin);
      drawText(x, y);
    }
  } else if (options.type === 'image' && options.image) {
    const logo = await loadImage(URL.createObjectURL(options.image));
    const markW = Math.floor(canvas.width * 0.2);
    const markH = Math.floor((markW / logo.naturalWidth) * logo.naturalHeight);
    ctx.globalAlpha = alpha;

    if (options.position === 'tile') {
      const stepX = markW + canvas.width * 0.1;
      const stepY = markH + canvas.height * 0.1;
      for (let y = 0; y < canvas.height; y += stepY) {
        for (let x = 0; x < canvas.width; x += stepX) {
          ctx.drawImage(logo, x, y, markW, markH);
        }
      }
    } else {
      const { x, y } = placement(options.position, canvas.width, canvas.height, markW, markH, margin);
      ctx.drawImage(logo, x, y, markW, markH);
    }
  }

  ctx.globalAlpha = 1;

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export image'))),
      outputType,
      0.92,
    );
  });
}
