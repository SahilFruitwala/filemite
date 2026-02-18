import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MicroPng',
    short_name: 'MicroPng',
    description: 'Professional local-first image compression and manipulation tools.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#10b981',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
