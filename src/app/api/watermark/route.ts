import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Configuration: Adjust these limits as needed
const MAX_WIDTH = 8192; 
const DEFAULT_QUALITY = 92;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedFormat = formData.get('format') as string;
    
    // Watermark params
    const watermarkType = formData.get('watermarkType') as string; // 'text' | 'image' | undefined
    const watermarkText = formData.get('watermarkText') as string;
    const watermarkImage = formData.get('watermarkImage') as File;
    const watermarkOpacity = parseInt((formData.get('watermarkOpacity') as string) || '50');
    const watermarkPosition = (formData.get('watermarkPosition') as string) || 'southeast'; // 'center' | 'southeast' | ... | 'tile'

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

    // 3. Pre-processing: Auto-rotate and Resize (Max Width for reasonable processing)
    pipeline.rotate(); 
    if (metadata.width && metadata.width > MAX_WIDTH) {
      pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' });
    }

    // --- WATERMARK LOGIC START ---
    // We need to render the pipeline to a buffer first to get dimensions for positioning/tiling,
    // or just use the metadata if no resize happened. But resize might have happened.
    // To be safe and simple, let's process the current pipeline to a buffer, 
    // then start a new pipeline for watermarking.
    const currentBuffer = await pipeline.toBuffer();
    const currentImage = sharp(currentBuffer);
    const currentMeta = await currentImage.metadata();
    const mainWidth = currentMeta.width || 1000;
    const mainHeight = currentMeta.height || 1000;

    let compositeInput: Buffer | null = null;
    let gravity = 'southeast';
    let tile = false;

    if (watermarkType === 'text' && watermarkText) {
            // Create an SVG for the text
            // Scale text size relative to image width (e.g. 5% of width)
            const fontSize = Math.max(16, Math.floor(mainWidth * 0.05));
            // Let's try creating a text image that is reasonably sized.
            const width = Math.floor(mainWidth * 0.5); // Text box max width 50%
            const height = Math.floor(mainHeight * 0.2);
            
            const svgText = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <style>
                    .text { 
                        fill: white; 
                        font-size: ${fontSize}px; 
                        font-weight: bold; 
                        font-family: Arial, sans-serif;
                        fill-opacity: ${watermarkOpacity / 100};
                        stroke: black;
                        stroke-width: 1px;
                        stroke-opacity: ${Math.max(0, (watermarkOpacity / 100) - 0.2)};
                    }
                </style>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="text">${watermarkText}</text>
            </svg>
            `;
            compositeInput = Buffer.from(svgText);

    } else if (watermarkType === 'image' && watermarkImage) {
        const wArrayBuffer = await watermarkImage.arrayBuffer();
        const wBuffer = Buffer.from(wArrayBuffer);
        
        // Resize logo to be relative to main image (e.g., 20% width)
        const wLogoWidth = Math.floor(mainWidth * 0.2);
        
        const logo = sharp(wBuffer).resize({ width: wLogoWidth });
        
        // Applied opacity via composite
        compositeInput = await logo
            .ensureAlpha()
            .composite([{
                    input: Buffer.from([255, 255, 255, Math.floor(255 * (watermarkOpacity / 100))]),
                    raw: { width: 1, height: 1, channels: 4 },
                    tile: true,
                    blend: 'dest-in'
            }])
            .toBuffer();
    }

    if (compositeInput) {
            if (watermarkPosition === 'tile') {
                tile = true;
                gravity = 'center'; // Irrelevant if tiled, but sharp needs it
            } else {
                gravity = watermarkPosition;
            }

            // Re-initialize pipeline with the (potentially resized/rotated) buffer
            // so we can composite on top.
            pipeline = sharp(currentBuffer);
            pipeline.composite([{
                input: compositeInput,
                gravity: gravity as any,
                tile: tile
            }]);
    }
    // --- WATERMARK LOGIC END ---

    const contentType = `image/${targetFormat === 'avif' ? 'avif' : targetFormat}`;

    // Output with standard high quality
    const processedBuffer = await pipeline.toFormat(targetFormat as any, { quality: DEFAULT_QUALITY }).toBuffer();

    return new NextResponse(processedBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': processedBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="watermarked.${targetFormat}"`,
        'Cache-Control': 'public, max-age=31536000, immutable', 
      },
    });

  } catch (error) {
    console.error('Watermark error:', error);
    return NextResponse.json({ error: 'Watermark failed' }, { status: 500 });
  }
}
