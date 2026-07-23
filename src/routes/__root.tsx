import React, { useEffect } from 'react';
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { Theme } from '@astryxdesign/core';
import { AppShell } from '@astryxdesign/core/AppShell';
import { LinkProvider } from '@astryxdesign/core/Link';
import posthog from 'posthog-js';

import { micropngTheme } from '@/theme/micropng';
import { ModeProvider, useMode } from '@/components/shell/mode';
import SiteNav from '@/components/shell/SiteNav';
import SiteFooter from '@/components/shell/SiteFooter';
import NotFoundPage from '@/tools/NotFoundPage';
import appCss from '@/styles/app.css?url';

const SITE_URL = 'https://micropng.sahilfruitwala.com';
const TITLE = 'MicroPNG - Professional Image Compression';
const DESCRIPTION =
  'Fast, secure image compression. Shrink PNG, JPEG, WebP, and HEIC without storing your files.';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      {
        name: 'keywords',
        content:
          'image compression, compress png, compress jpeg, optimize images, web performance, privacy focused',
      },
      { name: 'application-name', content: 'MicroPNG' },
      { name: 'theme-color', content: '#ea580c' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'MicroPNG' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: `${SITE_URL}/opengraph.webp` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: `${SITE_URL}/opengraph.webp` },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/icon.webp' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'canonical', href: SITE_URL },
    ],
    scripts: [
      {
        // Apply the stored color mode before first paint to avoid a flash
        children: `try{var m=localStorage.getItem('micropng-mode');if(m==='light'||m==='dark'){document.documentElement.setAttribute('data-theme',m)}}catch(e){}`,
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'MicroPNG',
          url: SITE_URL,
          description: DESCRIPTION,
          publisher: {
            '@type': 'Organization',
            name: 'MicroPNG',
            url: SITE_URL,
            logo: `${SITE_URL}/icon.webp`,
            sameAs: [
              'https://github.com/SahilFruitwala',
              'https://www.linkedin.com/in/sahilfruitwala/',
              'https://x.com/sahilbeingsahil',
              'https://instagram.com/its_sahilbeingsahil',
              'https://youtube.com/@sahilbeingsahil',
            ],
          },
        }),
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RouterLink(props: React.ComponentProps<'a'> & { href?: string }) {
  const { href, ...rest } = props;
  if (!href || href.startsWith('http') || href.startsWith('#')) {
    return <a href={href} {...rest} />;
  }
  return <Link to={href} {...(rest as Record<string, unknown>)} />;
}

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

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { mode } = useMode();
  return (
    <Theme theme={micropngTheme} mode={mode}>
      <LinkProvider component={RouterLink}>{children}</LinkProvider>
    </Theme>
  );
}

function RootLayout() {
  // Clear any previously installed PWA service workers so they don't intercept API calls.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        void reg.unregister();
      }
    });
  }, []);

  useEffect(() => {
    const key = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (key && !posthog.__loaded) {
      posthog.init(key, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        defaults: '2026-01-30',
        capture_exceptions: true,
        debug: import.meta.env.DEV,
      });
    }
  }, []);

  return (
    <ModeProvider>
      <ThemedApp>
        <AppShell topNav={<SiteNav />} height="auto" variant="surface" contentPadding={0}>
          <Outlet />
          <SiteFooter />
        </AppShell>
      </ThemedApp>
    </ModeProvider>
  );
}
