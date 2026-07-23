import { createFileRoute } from '@tanstack/react-router';
import { SITE_URL } from '@/lib/seo';

const routes: { path: string; changefreq: string; priority: string }[] = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/resize', changefreq: 'weekly', priority: '0.8' },
  { path: '/crop', changefreq: 'weekly', priority: '0.8' },
  { path: '/palette', changefreq: 'weekly', priority: '0.8' },
  { path: '/scrub', changefreq: 'weekly', priority: '0.8' },
  { path: '/compare', changefreq: 'weekly', priority: '0.9' },
  { path: '/favicon', changefreq: 'weekly', priority: '0.8' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
];

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const lastmod = new Date().toISOString();
        const urls = routes
          .map(
            ({ path, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
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
