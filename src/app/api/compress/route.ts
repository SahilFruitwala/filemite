import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Configuration: Adjust these limits as needed
const MAX_WIDTH = 1920; // Downscale images larger than 1080p/4K to save massive space
const COMPRESSION_EFFORT = 6; // Balance between CPU usage and file size (0-9)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedFormat = formData.get('format') as string;

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

    // 4. Apply Format-Specific Aggressive Compression
    let contentType = `image/${targetFormat}`;
    
    switch (targetFormat) {
      case 'jpeg':
        pipeline.jpeg({
          quality: 75,
          mozjpeg: true, // Best standard JPEG compressor
          chromaSubsampling: '4:2:0',
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
          quantisationTable: 3,
        });
        break;

      case 'png':
        pipeline.png({
          quality: 50, // Requires palette: true to work effectively
          compressionLevel: 9, // Max compression (slower)
          palette: true, // Quantize colors (TinyPNG style)
          colors: 128, // Reduce color space
          effort: 10, // Max CPU effort for smallest size
          adaptiveFiltering: false,
        });
        break;

      case 'webp':
        pipeline.webp({
          quality: 70, // Slightly lower than 75 often yields huge savings with little difference
          effort: 6,
          smartSubsample: true,
          lossless: false,
        });
        break;

      case 'avif':
        // AVIF: The King of Compression
        pipeline.avif({
          quality: 50, // AVIF looks great even at low quality settings
          effort: 5, // 9 is too slow for real-time APIs, 4-6 is the sweet spot
          chromaSubsampling: '4:2:0',
        });
        contentType = 'image/avif';
        break;

      default:
        // Fallback for formats Sharp can handle but we didn't explicitly optimize
        // Or force convert weird formats to WebP
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