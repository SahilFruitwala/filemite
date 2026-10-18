import { Link } from '@tanstack/react-router';

import { LogoMark, Wordmark } from '@/components/shell/logo';
import { AUTHOR, SITE_TAGLINE, SOCIAL_LINKS, SOURCE_URL } from '@/lib/site';
import { SECTIONS, toolsIn, type Section } from '@/lib/tools';

// min-h keeps every link a comfortable touch target without changing the visual rhythm.
const linkClass =
  'inline-flex min-h-8 items-center text-muted-foreground transition-colors hover:text-foreground';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_0.8fr] lg:px-8">
        <div className="space-y-4">
          <Link to="/" className="inline-flex items-center gap-2">
            <LogoMark />
            <Wordmark />
          </Link>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            {SITE_TAGLINE} Images are processed in memory and never stored. PDFs never leave your
            device.
          </p>
        </div>

        {(['image', 'pdf'] as Section[]).map((section) => (
          <div key={section} data-section={section} className="space-y-3 text-sm">
            <p className="eyebrow flex items-center gap-2">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {SECTIONS[section].title}
            </p>
            <ul className="space-y-0.5">
              {toolsIn(section).map((tool) => (
                <li key={tool.id}>
                  <Link to={tool.href} className={linkClass}>
                    {tool.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="space-y-3 text-sm">
          <p className="eyebrow">About</p>
          <ul className="space-y-0.5">
            <li>
              <Link to="/privacy" className={linkClass}>
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                Terms
              </Link>
            </li>
            <li>
              <a href={SOURCE_URL} className={linkClass}>
                Source code
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()}{' '}
            <a href={AUTHOR.url} className="inline-flex min-h-8 items-center hover:text-foreground">
              {AUTHOR.name}
            </a>{' '}
            · Free software under{' '}
            <a
              href={`${SOURCE_URL}/blob/master/LICENSE`}
              className="inline-flex min-h-8 items-center underline underline-offset-2 hover:text-foreground"
            >
              AGPL-3.0
            </a>{' '}
            · PDF engine by{' '}
            <a
              href="https://mupdf.com"
              className="inline-flex min-h-8 items-center underline underline-offset-2 hover:text-foreground"
            >
              MuPDF
            </a>
          </p>
          <ul className="flex flex-wrap gap-x-3">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 min-w-8 items-center justify-center hover:text-foreground"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
