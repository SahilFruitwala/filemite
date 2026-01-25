import { NextRequest, NextResponse } from 'next/server';
import pngToIco from 'png-to-ico';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Convert files to buffers
    const buffers = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer);
      })
    );

    // Generate .ico from PNG buffers
    const icoBuffer = await pngToIco(buffers);

    return new NextResponse(icoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Content-Disposition': 'attachment; filename="favicon.ico"',
      },
    });
  } catch (error) {
    console.error('ICO generation error:', error);
    return NextResponse.json({ error: 'Failed to generate .ico file' }, { status: 500 });
  }
}
