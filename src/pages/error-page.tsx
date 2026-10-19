import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';

/** Shown when a route throws while rendering, so a bug never leaves a blank page. */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center"
    >
      <p className="font-mono text-sm text-subtle">Something broke</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
        That didn’t work
      </h1>
      <p className="mt-3 text-muted-foreground">
        An unexpected error stopped this page. Your files haven’t been sent anywhere — try again,
        or head back home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Home
        </Link>
      </div>
    </div>
  );
}
