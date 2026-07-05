export const PWA_MANIFEST = {
  id: '/',
  name: 'MicroPNG',
  short_name: 'MicroPNG',
  description: 'Professional local-first image compression and manipulation tools.',
  start_url: '/',
  scope: '/',
  display: 'standalone' as const,
  orientation: 'any' as const,
  background_color: '#1b1b1b',
  theme_color: '#ea580c',
  categories: ['utilities', 'productivity', 'photo'],
  icons: [
    { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
