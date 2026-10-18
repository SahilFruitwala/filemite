declare module 'smartcrop' {
  type Crop = { x: number; y: number; width: number; height: number };
  type Source = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  export function crop(
    image: Source,
    options: { width: number; height: number; minScale?: number },
  ): Promise<{ topCrop: Crop }>;
  const smartcrop: { crop: typeof crop };
  export default smartcrop;
}
