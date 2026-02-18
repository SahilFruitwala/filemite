import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://micropng.sahilfruitwala.com';

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
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/compare' ? 0.9 : 0.8,
  }));
}
