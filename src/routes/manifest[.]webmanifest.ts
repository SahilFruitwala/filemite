import { createFileRoute } from '@tanstack/react-router';
import { PWA_MANIFEST } from '@/lib/pwa';

export const Route = createFileRoute('/manifest.webmanifest')({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(PWA_MANIFEST), {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=86400',
          },
        }),
    },
  },
});
