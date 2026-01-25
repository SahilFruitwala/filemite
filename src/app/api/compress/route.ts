import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pipeline = sharp(buffer);
    const metadata = await pipeline.metadata();

    let processedBuffer;
    let contentType = file.type;

    // Aggressive compression strategy similar to TinyPNG
    // Note: We use failOnError: false for robustness
    pipeline = sharp(buffer, { failOnError: false });

    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      processedBuffer = await pipeline
        .jpeg({
          quality: 75, // Reduced to 75 for better compression
          mozjpeg: true,
          chromaSubsampling: '4:2:0',
          trellisQuantisation: true, 
          overshootDeringing: true,
          optimizeScans: true,
          quantisationTable: 3, // ImageMagick compatible
        })
        .toBuffer();
      contentType = 'image/jpeg';
    } else if (metadata.format === 'png') {
      processedBuffer = await pipeline
        .png({
          quality: 50, // Reduced to 50 based on benchmark
          compressionLevel: 9,
          palette: true, 
          colors: 128, 
          effort: 10,
          adaptiveFiltering: false, // Disabled for better compression
        })
        .toBuffer();
      contentType = 'image/png';
    } else if (metadata.format === 'webp') {
      processedBuffer = await pipeline
        .webp({
          quality: 75, // Reduced to 75
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer();
      contentType = 'image/webp';
    } else {
      // Check requested format or fallback
      const requestedFormat = formData.get('format') as string;

      if (requestedFormat === 'png') {
        processedBuffer = await pipeline
          .png({
            quality: 50,
            compressionLevel: 9,
            palette: true,
            colors: 128,
            effort: 10,
            adaptiveFiltering: false,
          })
          .toBuffer();
        contentType = 'image/png';
      } else if (requestedFormat === 'jpeg' || requestedFormat === 'jpg') {
        processedBuffer = await pipeline
          .jpeg({
            quality: 75,
            mozjpeg: true,
            chromaSubsampling: '4:2:0',
            trellisQuantisation: true,
            overshootDeringing: true,
            optimizeScans: true,
            quantisationTable: 3,
          })
          .toBuffer();
        contentType = 'image/jpeg';
      } else if (requestedFormat === 'webp') {
        processedBuffer = await pipeline
          .webp({
            quality: 75,
            effort: 6,
            smartSubsample: true,
          })
          .toBuffer();
        contentType = 'image/webp';
      } else {
        // Default optimization based on detected format
        const format = metadata.format as string;

        if (format === 'png') {
          processedBuffer = await pipeline
            .png({
              quality: 50,
              compressionLevel: 9,
              palette: true,
              colors: 128,
              effort: 10,
              adaptiveFiltering: false,
            })
            .toBuffer();
          // contentType already set potentially, but ensure it matches
           contentType = 'image/png';
        } else if (format === 'jpeg' || format === 'jpg') {
          processedBuffer = await pipeline
            .jpeg({
              quality: 75,
              mozjpeg: true,
              chromaSubsampling: '4:2:0',
              trellisQuantisation: true,
              overshootDeringing: true,
              optimizeScans: true,
              quantisationTable: 3,
            })
            .toBuffer();
           contentType = 'image/jpeg';
        } else if (format === 'webp') {
          processedBuffer = await pipeline
            .webp({
              quality: 75,
              effort: 6,
              smartSubsample: true,
            })
            .toBuffer();
           contentType = 'image/webp';
        } else {
          // Fallback to WebP if format is unknown/unsupported for direct pass-through optimization
          processedBuffer = await pipeline
            .webp({
              quality: 75,
              effort: 6,
              smartSubsample: true,
            })
            .toBuffer();
          contentType = 'image/webp';
        }
      }
    }

        return new NextResponse(processedBuffer as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="compressed.${contentType.split('/')[1]}"`,
            },
        });

  } catch (error) {
    console.error('Compression error:', error);
    return NextResponse.json({ error: 'Compression failed' }, { status: 500 });
  }
}
