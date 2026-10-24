import { createFileRoute } from '@tanstack/react-router';
import { SITE_URL } from '@/lib/seo';
import { tools } from '@/lib/tools';

const routes: { path: string; changefreq: string; priority: string }[] = [
  { path: '', changefreq: 'weekly', priority: '1.0' },
  ...tools.map((tool) => ({ path: tool.href, changefreq: 'weekly', priority: '0.9' })),
  { path: '/about', changefreq: 'monthly', priority: '0.4' },
  { path: '/contact', changefreq: 'monthly', priority: '0.4' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
];

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const urls = routes
          .map(
            ({ path, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
          )
          .join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
        });
      },
    },
  },
});
