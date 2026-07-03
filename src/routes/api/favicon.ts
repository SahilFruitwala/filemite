import { createFileRoute } from '@tanstack/react-router';
import { pngsToIco } from '@/lib/ico';

export const Route = createFileRoute('/api/favicon')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const files = formData.getAll('files').filter((f): f is File => f instanceof File);

          if (files.length === 0) {
            return new Response(JSON.stringify({ error: 'No files provided' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const pngs = await Promise.all(
            files.map(async (file) => new Uint8Array(await file.arrayBuffer())),
          );
          const ico = pngsToIco(pngs);

          return new Response(new Blob([ico as BlobPart]), {
            status: 200,
            headers: {
              'Content-Type': 'image/x-icon',
              'Content-Disposition': 'attachment; filename="favicon.ico"',
            },
          });
        } catch (error) {
          console.error('ICO generation error:', error);
          return new Response(JSON.stringify({ error: 'Failed to generate .ico file' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
