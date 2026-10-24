import { useEffect } from 'react';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import posthog from 'posthog-js';

import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { ThemeProvider, themeBootScript } from '@/components/shell/theme';
import { NotFoundPage } from '@/pages/not-found';
import { organizationJsonLd } from '@/lib/seo';
import {
  AUTHOR,
  OG_IMAGE,
  OG_IMAGE_ALT,
  SITE_DESCRIPTION,
  SITE_NAME, SITE_TAGLINE,
  SITE_URL,
} from '@/lib/site';
import appCss from '@/styles/app.css?url';

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      { name: 'application-name', content: SITE_NAME },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: SITE_NAME },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'theme-color', content: '#fbf8f2', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#151311', media: '(prefers-color-scheme: dark)' },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: OG_IMAGE_ALT },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@sahilbeingsahil' },
      { name: 'twitter:creator', content: '@sahilbeingsahil' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE },
      { name: 'twitter:image:alt', content: OG_IMAGE_ALT },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
    scripts: [
      { children: themeBootScript },
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
          inLanguage: 'en',
          publisher: { '@id': organizationJsonLd()['@id'] },
          author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
        }),
      },
      { type: 'application/ld+json', children: JSON.stringify(organizationJsonLd()) },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  // The worker only caches static assets and pages; it skips /api and /ingest.
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);

  useEffect(() => {
    const key = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (key && !posthog.__loaded) {
      posthog.init(key, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        defaults: '2026-01-30',
        // Only the explicit events (counts, sizes, settings) are sent. Autocapture
        // and recordings could pick up file names shown on the page.
        autocapture: false,
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        person_profiles: 'identified_only',
        // Cookieless: the anonymous ID lives in memory only, so nothing is written to
        // cookies or localStorage and no consent banner is needed. See /privacy.
        persistence: 'memory',
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_performance: false,
        capture_exceptions: true,
        debug: import.meta.env.DEV,
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-foreground px-3 py-2 text-sm text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </ThemeProvider>
  );
}
