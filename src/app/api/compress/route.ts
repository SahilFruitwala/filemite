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
    const targetSizeMsg = formData.get('targetSize');
    const targetSize = targetSizeMsg ? parseInt(targetSizeMsg as string) : null;

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

    const contentType = `image/${targetFormat === 'avif' ? 'avif' : targetFormat}`;

    // 4. Compress
    // Define a helper to compress with specific quality
    const compressBuffer = async (quality: number) => {
        const pipe = pipeline.clone(); // Clone to reuse base pipeline (resize/rotate)
        
        switch (targetFormat) {
            case 'jpeg':
                pipe.jpeg({
                  quality: quality,
                  mozjpeg: true,
                  chromaSubsampling: '4:2:0',
                  trellisQuantisation: true,
                  overshootDeringing: true,
                  optimizeScans: true,
                  quantisationTable: 3,
                });
                break;
            case 'png':
                // Map 0-100 quality to PNG settings
                // PNG quality in sharp is different. We'll map it.
                // low quality -> low colors
                const colors = Math.max(2, Math.floor((quality / 100) * 256));
                 pipe.png({
                    quality: quality,
                    palette: true,
                    colors: colors,
                    compressionLevel: 9,
                    effort: 10,
                    adaptiveFiltering: false,
                });
                break;
            case 'webp':
                pipe.webp({
                    quality: quality,
                    effort: 6,
                    smartSubsample: true,
                    lossless: false,
                });
                break;
            case 'avif':
                 pipe.avif({
                    quality: Math.min(quality, 85), // AVIF at 100 is overkill
                    effort: 5,
                    chromaSubsampling: '4:2:0',
                });
                break;
            default:
                pipe.toFormat('webp', { quality: quality });
                break;
        }
        return await pipe.toBuffer();
    };

    let processedBuffer: Buffer;

    if (targetSize) {
        // --- Target Size Mode (Binary Search) ---
        let minQ = 1;
        let maxQ = 100;
        let bestBuffer: Buffer | null = null;
        let minSizeBuffer: Buffer | null = null;
        let minSizeVal = Infinity;

        // Start with a reasonable guess or strictly binary search
        while (minQ <= maxQ) {
            const midQ = Math.floor((minQ + maxQ) / 2);
            const buf = await compressBuffer(midQ);
            const size = buf.length;

            if (size < minSizeVal) {
                minSizeVal = size;
                minSizeBuffer = buf;
            }

            if (size <= targetSize) {
                // Fits! Try to push quality higher
                bestBuffer = buf;
                minQ = midQ + 1;
            } else {
                // Too big, lower quality
                maxQ = midQ - 1;
            }
        }

        // If we found a fit, use it. Otherwise use the smallest we found.
        processedBuffer = bestBuffer || minSizeBuffer!; 

    } else {
        // --- Standard Mode (Level Based) ---
        // Determine quality based on level
        let quality = 75; // Default (mid)
        if (compressionLevel === 'best') quality = 90;
        if (compressionLevel === 'low') quality = 40; // slightly lower for low
        
        // For standard mode, just run once
        processedBuffer = await compressBuffer(quality);
    }

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