import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { SECTIONS } from '@/lib/tools';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center">
      {/* React hoists this tag into <head>; crawlers take the stricter value over the site-wide robots default. */}
      <meta name="robots" content="noindex, follow" />
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        That page doesn’t exist or has moved. Pick a tool to get going.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          <ArrowLeft />
          Home
        </Link>
        <Link
          to={SECTIONS.image.href}
          data-section="image"
          className={buttonVariants({ size: 'lg' })}
        >
          Image tools
        </Link>
        <Link to={SECTIONS.pdf.href} data-section="pdf" className={buttonVariants({ size: 'lg' })}>
          PDF tools
        </Link>
      </div>
    </div>
  );
}
