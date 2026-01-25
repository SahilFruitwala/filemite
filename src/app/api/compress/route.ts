import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Configuration: Adjust these limits as needed
const MAX_WIDTH = 1920; // Downscale images larger than 1080p/4K to save massive space

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedFormat = formData.get('format') as string;
    const compressionLevel = (formData.get('level') as string) || 'mid'; // 'best' | 'mid' | 'low'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Initialize pipeline with failOnError: false
    const pipeline = sharp(buffer, { failOnError: false });
    const metadata = await pipeline.metadata();

    // 2. Determine Output Format
    // Use requested format, or default to the original format. 
    // Fallback to 'jpeg' if the input format is raw/unsupported.
    let targetFormat = (requestedFormat || metadata.format || 'jpeg').toLowerCase();
    
    // Normalize 'jpg' to 'jpeg'
    if (targetFormat === 'jpg') targetFormat = 'jpeg';

    // 3. Pre-processing: Auto-rotate and Resize
    // .rotate() uses EXIF data to orient the image correctly before we strip metadata
    pipeline.rotate(); 

    // Only resize if the image is wider than our limit to save massive file size
    if (metadata.width && metadata.width > MAX_WIDTH) {
      pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' });
    }

    // 4. Apply Format-Specific Compression based on Level
    let contentType = `image/${targetFormat}`;
    
    switch (targetFormat) {
      case 'jpeg':
        let jpegQuality = 75;
        if (compressionLevel === 'best') jpegQuality = 90;
        if (compressionLevel === 'low') jpegQuality = 50;

        pipeline.jpeg({
          quality: jpegQuality,
          mozjpeg: true, // Best standard JPEG compressor
          chromaSubsampling: '4:2:0',
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
          quantisationTable: 3,
        });
        break;

      case 'png':
        let pngQuality = 60;
        let pngColors = 128;
        
        if (compressionLevel === 'best') {
             pngQuality = 85;
             pngColors = 256;
        }
        if (compressionLevel === 'low') {
            pngQuality = 40;
            pngColors = 64;
        }

        pipeline.png({
          quality: pngQuality, // Requires palette: true to work effectively
          compressionLevel: 9, // Max compression (slower)
          palette: true, // Quantize colors (TinyPNG style)
          colors: pngColors, // Reduce color space
          effort: 10, // Max CPU effort for smallest size
          adaptiveFiltering: false,
        });
        break;

      case 'webp':
        let webpQuality = 75;
        if (compressionLevel === 'best') webpQuality = 90;
        if (compressionLevel === 'low') webpQuality = 50;
        
        pipeline.webp({
          quality: webpQuality,
          effort: 6,
          smartSubsample: true,
          lossless: false,
        });
        break;

      case 'avif':
        let avifQuality = 50;
        if (compressionLevel === 'best') avifQuality = 70;
        if (compressionLevel === 'low') avifQuality = 30;

        pipeline.avif({
          quality: avifQuality, 
          effort: 5, // 9 is too slow for real-time APIs, 4-6 is the sweet spot
          chromaSubsampling: '4:2:0',
        });
        contentType = 'image/avif';
        break;

      default:
        // Fallback for formats Sharp can handle but we didn't explicitly optimize
         pipeline.toFormat('webp', { quality: 75 });
         contentType = 'image/webp';
         targetFormat = 'webp';
        break;
    }

    const processedBuffer = await pipeline.toBuffer();

    // 5. Return Response
    return new NextResponse(processedBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': processedBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="compressed.${targetFormat}"`,
        // Cache control is useful if you change this to GET later
        'Cache-Control': 'public, max-age=31536000, immutable', 
      },
    });

  } catch (error) {
    console.error('Compression error:', error);
    return NextResponse.json({ error: 'Compression failed' }, { status: 500 });
  }
}