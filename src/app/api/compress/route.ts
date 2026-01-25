import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Configuration: Adjust these limits as needed
const MAX_WIDTH = 1920; // Downscale images larger than 1080p/4K to save massive space

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedFormat = formData.get('format') as string;
    const compressionLevel = (formData.get('level') as string) || 'mid'; // 'best' | 'mid' | 'low' | 'lossless'
    const targetSizeMsg = formData.get('targetSize');
    const targetSize = targetSizeMsg ? parseInt(targetSizeMsg as string) : null;

    // Parse resize options
    const widthRaw = formData.get('width');
    const heightRaw = formData.get('height');
    const resizeFit = (formData.get('fit') as keyof sharp.FitEnum) || 'cover';
    
    // Only parse if values are provided and valid numbers
    const finalWidth = widthRaw ? parseInt(widthRaw as string) : undefined;
    const finalHeight = heightRaw ? parseInt(heightRaw as string) : undefined;
    
    // Check if we have valid resize dimensions
    const shouldResize = (finalWidth && !isNaN(finalWidth)) || (finalHeight && !isNaN(finalHeight));

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

    // Apply explicit resize if requested, otherwise check default max limits
    if (shouldResize) {
        pipeline.resize({
            width: finalWidth,
            height: finalHeight,
            fit: resizeFit,
            withoutEnlargement: false // Allow enlargement if user explicitly requests dimensions
        });
    } else if (metadata.width && metadata.width > MAX_WIDTH) {
      // Only default resize if no explicit dimensions provided
      pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' });
    }

    const contentType = `image/${targetFormat === 'avif' ? 'avif' : targetFormat}`;

    // 4. Compress
    // 4. Compress
    // Define a helper to compress with specific quality
    const compressBuffer = async (quality: number) => {
        // Clone the pipeline to ensure base operations (rotate/resize) are preserved
        // Note: sharp instances are mutable for some operations but .clone() is safer for branching
        const pipe = pipeline.clone(); 
        
        switch (targetFormat) {
            case 'jpeg':
                if (compressionLevel === 'lossless') {
                    // High fidelity JPEG settings
                    pipe.jpeg({
                        quality: 100,
                        mozjpeg: false, // Standard JPEG engine for speed/compatibility in resize mode
                        chromaSubsampling: '4:4:4', // No color subsampling
                    });
                } else {
                    // Standard compression settings
                    pipe.jpeg({
                        quality: quality,
                        mozjpeg: true,
                        chromaSubsampling: '4:2:0',
                        trellisQuantisation: true,
                        overshootDeringing: true,
                        optimizeScans: true,
                        quantisationTable: 3,
                    });
                }
                break;
            case 'png':
                if (quality === 100 || compressionLevel === 'lossless') {
                     // True Lossless PNG
                     pipe.png({
                        quality: 100,
                        palette: false,
                        compressionLevel: 9,
                        adaptiveFiltering: true,
                    });
                } else {
                    // Lossy/Optimized PNG
                    const colors = Math.max(2, Math.floor((quality / 100) * 256));
                     pipe.png({
                        quality: quality,
                        palette: true,
                        colors: colors,
                        compressionLevel: 9,
                        adaptiveFiltering: false,
                    });
                }
                break;
            case 'webp':
                if (compressionLevel === 'lossless') {
                    pipe.webp({
                        lossless: true,
                        quality: 100,
                        effort: 6
                    });
                } else {
                    pipe.webp({
                         quality: quality,
                         effort: 6,
                         smartSubsample: true,
                         lossless: false,
                    });
                }
                break;
            case 'avif':
                 pipe.avif({
                    quality: Math.min(quality, 85),
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
        
        // Handle lossless/resize-only mode
        if (compressionLevel === 'lossless') {
            quality = 100;
            // For PNG/WebP we could use proper lossless settings, but for simple implementation quality=100 is often close enough or use specific flags
            // However, our compressBuffer function applies format specifics:
            // PNG: palette=true by default in current code -> this forces lossy color reduction!
            // We need to adjust compressBuffer to support lossless if needed.
        }
        
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