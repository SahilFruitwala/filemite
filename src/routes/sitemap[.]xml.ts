import { createFileRoute } from '@tanstack/react-router';
import { SITE_URL } from '@/lib/seo';

const routes = [
  '',
  '/convert',
  '/pdf',
  '/resize',
  '/crop',
  '/filters',
  '/glass',
  '/tracer',
  '/watermark',
  '/palette',
  '/scrub',
  '/compare',
  '/cli',
  '/favicon',
];

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const lastmod = new Date().toISOString();
        const urls = routes
          .map(
            (route) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '' ? '1.0' : route === '/compare' ? '0.9' : '0.8'}</priority>
  </url>`,
          )
          .join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
