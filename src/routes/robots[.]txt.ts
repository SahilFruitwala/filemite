import { createFileRoute } from '@tanstack/react-router';
import { SITE_URL } from '@/lib/seo';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /ingest/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
          { headers: { 'Content-Type': 'text/plain' } },
        ),
    },
  },
});
