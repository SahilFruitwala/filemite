import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/manifest.webmanifest')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          JSON.stringify({
            name: 'MicroPNG',
            short_name: 'MicroPNG',
            description:
              'Professional local-first image compression and manipulation tools.',
            start_url: '/',
            display: 'standalone',
            background_color: '#1b1b1b',
            theme_color: '#ea580c',
            icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
          }),
          { headers: { 'Content-Type': 'application/manifest+json' } },
        ),
    },
  },
});
