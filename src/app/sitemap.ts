import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://micropng.sahilfruitwala.com';

  const routes = [
    '',
    '/convert',
    '/favicon',
    '/scrub',
    '/palette',
    '/watermark',
    '/compare',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/compare' ? 0.9 : 0.8,
  }));
}
