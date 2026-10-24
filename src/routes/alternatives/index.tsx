import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { alternatives } from '@/lib/alternatives';
import { seoHead } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const Route = createFileRoute('/alternatives/')({
  head: () =>
    seoHead({
      title: 'Free Alternatives to iLovePDF, Smallpdf and TinyPNG',
      description: `How ${SITE_NAME} compares with popular PDF and image tools: what each does better, plan limits, and where your files are processed.`,
      path: '/alternatives',
    }),
  component: AlternativesPage,
});

function AlternativesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow mb-3">Compare</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {SITE_NAME} alternatives
      </h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">
        Honest comparisons with the tools you might be using now: what they do better, where their
        free plans stop, and where your files go.
      </p>
      <ul className="mt-12 space-y-3">
        {alternatives.map((alt) => (
          <li key={alt.slug}>
            <Link
              to="/alternatives/$slug"
              params={{ slug: alt.slug }}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <span>
                <span className="block font-display text-xl font-semibold tracking-tight">
                  {alt.name} alternative
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {alt.name} is an {alt.kind}.
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
