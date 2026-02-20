
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const action = req.nextUrl.searchParams.get("action");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (action === "view") {
      const metadata = await sharp(buffer).metadata();
      // Filter for interesting exif tags if needed, or return all
      // We return the raw metadata for the frontend to parse/display
      return NextResponse.json({ metadata });
    } else if (action === "scrub") {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const format = metadata.format;

      let pipeline;

      // Logic to preserve quality based on format
      if (format === 'jpeg' || format === 'jpg') {
          pipeline = image.jpeg({ quality: 100, chromaSubsampling: '4:4:4' });
      } else if (format === 'png') {
          pipeline = image.png({ compressionLevel: 9 }); // Lossless, max compression (slower but smaller) or use adaptive filtering
      } else if (format === 'webp') {
          pipeline = image.webp({ quality: 100, lossless: true });
      } else {
          // Fallback to default or just pass through if supported
           pipeline = image;
      }

      // Strip metadata
      // Sharp removes metadata by default unless .withMetadata() is called.
      // So we just proceed to convert to buffer.
      const scrubbedBuffer = await pipeline.toBuffer();

      // Track server-side scrub event
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: 'server',
        event: 'server_metadata_scrubbed',
        properties: {
          file_format: format || 'unknown',
          original_size_bytes: buffer.length,
          scrubbed_size_bytes: scrubbedBuffer.length,
        },
      });

      return new NextResponse(scrubbedBuffer as unknown as BodyInit, {
        headers: {
          "Content-Type": file.type,
          "Content-Disposition": `attachment; filename="scrubbed-${file.name}"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Scrub error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}
