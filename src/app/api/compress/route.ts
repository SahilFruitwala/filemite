import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Configuration: Adjust these limits as needed
const MAX_WIDTH = 1920; 

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedFormat = formData.get('format') as string;
    const compressionLevel = (formData.get('level') as string) || 'mid'; // 'best' | 'mid' | 'low' | 'lossless'
    const targetSizeMsg = formData.get('targetSize');
    const targetSize = targetSizeMsg ? parseInt(targetSizeMsg as string) : null;
    const speed = formData.get('speed') as string || 'normal'; // 'fast' | 'normal'

    // Parse resize & crop options
    const widthRaw = formData.get('width');
    const heightRaw = formData.get('height');
    const resizeFit = (formData.get('fit') as keyof sharp.FitEnum) || 'cover';
    
    // Manual Crop parameters (pixels)
    const cropX = formData.get('cropX') ? parseInt(formData.get('cropX') as string) : null;
    const cropY = formData.get('cropY') ? parseInt(formData.get('cropY') as string) : null;
    const cropW = formData.get('cropW') ? parseInt(formData.get('cropW') as string) : null;
    const cropH = formData.get('cropH') ? parseInt(formData.get('cropH') as string) : null;
    
    const finalWidth = widthRaw ? parseInt(widthRaw as string) : undefined;
    const finalHeight = heightRaw ? parseInt(heightRaw as string) : undefined;
    
    const shouldCrop = cropW !== null && cropH !== null && cropX !== null && cropY !== null;
    const shouldResize = (finalWidth && !isNaN(finalWidth)) || (finalHeight && !isNaN(finalHeight));

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Initialize pipeline with failOnError: false
    let pipeline = sharp(buffer, { failOnError: false });
    const metadata = await pipeline.metadata();

    // 2. Determine Output Format
    let targetFormat = (requestedFormat || metadata.format || 'jpeg').toLowerCase();
    
    if (targetFormat === 'jpg') targetFormat = 'jpeg';

    // 3. Pre-processing: Manual Crop, Auto-rotate, and Resize
    pipeline.rotate(); 

    if (shouldCrop) {
        pipeline.extract({
            left: Math.max(0, cropX!),
            top: Math.max(0, cropY!),
            width: cropW!,
            height: cropH!
        });
    }

    if (shouldResize) {
        pipeline.resize({
            width: finalWidth,
            height: finalHeight,
            fit: resizeFit,
            withoutEnlargement: false 
        });
    } else if (metadata.width && metadata.width > MAX_WIDTH) {
      pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' });
    }

    const contentType = `image/${targetFormat === 'avif' ? 'avif' : targetFormat}`;

    // 4. Compress helper
    const compressBuffer = async (quality: number, isFast: boolean = false) => {
        const pipe = pipeline.clone(); 
        const currentSpeed = isFast ? 'fast' : speed;
        
        switch (targetFormat) {
            case 'jpeg':
                if (compressionLevel === 'lossless' || currentSpeed === 'fast') {
                    pipe.jpeg({ quality: 100, mozjpeg: false, chromaSubsampling: '4:4:4' });
                } else {
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
                if (quality === 100 || compressionLevel === 'lossless' || currentSpeed === 'fast') {
                     pipe.png({ 
                         quality: 100, 
                         palette: false, 
                         compressionLevel: currentSpeed === 'fast' ? 0 : 9, 
                         adaptiveFiltering: true 
                     });
                } else {
                    const colors = Math.max(2, Math.floor((quality / 100) * 256));
                     pipe.png({ 
                         quality: quality, 
                         palette: true, 
                         colors: colors, 
                         compressionLevel: currentSpeed === 'fast' ? 0 : 9, 
                         adaptiveFiltering: false 
                     });
                }
                break;
            case 'webp':
                if (compressionLevel === 'lossless') {
                    pipe.webp({ lossless: true, quality: 100, effort: currentSpeed === 'fast' ? 0 : 6 });
                } else {
                    pipe.webp({ quality: quality, effort: currentSpeed === 'fast' ? 0 : 6, smartSubsample: true, lossless: false });
                }
                break;
            case 'avif':
                 pipe.avif({ quality: Math.min(quality, 85), effort: currentSpeed === 'fast' ? 0 : 5, chromaSubsampling: '4:2:0' });
                break;
            default:
                pipe.toFormat('webp', { quality: quality, effort: currentSpeed === 'fast' ? 0 : 6 });
                break;
        }
        return await pipe.toBuffer();
    };

    let processedBuffer: Buffer;

    if (targetSize) {
        // --- Target Size Mode (Binary Search) ---
        let minQ = 1;
        let maxQ = 100;
        let bestQ = 0;
        let minSizeQ = 1;
        let minSizeVal = Infinity;

        while (minQ <= maxQ) {
            const midQ = Math.floor((minQ + maxQ) / 2);
            // Use Fast mode for search
            const buf = await compressBuffer(midQ, true);
            const size = buf.length;

            if (size < minSizeVal) {
                minSizeVal = size;
                minSizeQ = midQ;
            }

            if (size <= targetSize) {
                bestQ = midQ;
                minQ = midQ + 1;
            } else {
                maxQ = midQ - 1;
            }
        }
        
        // Final High Quality Pass
        const finalQ = bestQ || minSizeQ;
        processedBuffer = await compressBuffer(finalQ, false);

    } else {
        // --- Standard Mode ---
        let quality = 75;
        if (compressionLevel === 'best') quality = 90;
        if (compressionLevel === 'low') quality = 40; 
        if (compressionLevel === 'lossless') quality = 100;
        
        processedBuffer = await compressBuffer(quality);
    }

    return new NextResponse(processedBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': processedBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="compressed.${targetFormat}"`,
        'Cache-Control': 'public, max-age=31536000, immutable', 
      },
    });

  } catch (error) {
    console.error('Compression error:', error);
    return NextResponse.json({ error: 'Compression failed' }, { status: 500 });
  }
}
