import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowRight, Check } from 'lucide-react';

import JsonLd from '@/components/JsonLd';
import { FaqList } from '@/components/tool/faq-list';
import { buttonVariants } from '@/components/ui/button';
import { alternatives, CHECKED, getAlternative } from '@/lib/alternatives';
import { alternativeJsonLd, seoHead } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
import { getTool } from '@/lib/tools';

export const Route = createFileRoute('/alternatives/$slug')({
  loader: ({ params }) => {
    const alt = getAlternative(params.slug);
    if (!alt) throw notFound();
    return alt;
  },
  head: ({ loaderData }) =>
    loaderData
      ? seoHead({
          title: loaderData.seoTitle,
          description: loaderData.seoDescription,
          keywords: loaderData.keywords,
          path: `/alternatives/${loaderData.slug}`,
        })
      : {},
  component: AlternativePage,
});

function AlternativePage() {
  const alt = Route.useLoaderData();
  const others = alternatives.filter((other) => other.slug !== alt.slug);
  const firstTool = getTool(alt.tools[0]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-12 sm:px-6 sm:pt-16">
      <JsonLd data={alternativeJsonLd(alt)} />

      <nav aria-label="Breadcrumb" className="eyebrow mb-3">
        <Link to="/alternatives" className="hover:text-foreground">
          Alternatives
        </Link>{' '}
        / {alt.name}
      </nav>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        A free, private {alt.name} alternative
      </h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">{alt.tldr}</p>
      <div className="mt-8 flex flex-wrap gap-3" data-section={firstTool.section}>
        <Link to={firstTool.href} className={buttonVariants({ size: 'xl' })}>
          Try {firstTool.title}
          <ArrowRight />
        </Link>
      </div>

      <section aria-labelledby="why-heading" className="mt-16">
        <h2 id="why-heading" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Why people look for a {alt.name} alternative
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {alt.reasons.map((reason) => (
            <div key={reason.title} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">{reason.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{reason.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="compare-heading" className="mt-16">
        <h2 id="compare-heading" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {SITE_NAME} vs {alt.name}
        </h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="px-4 py-3 font-display font-semibold">
                  {SITE_NAME}
                </th>
                <th scope="col" className="px-4 py-3 font-display font-semibold">
                  {alt.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alt.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{row.filemite}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {alt.name} details from their{' '}
          <a href={alt.pricingUrl} rel="nofollow noopener" className="underline underline-offset-2">
            pricing page
          </a>
          , checked {CHECKED}. Plans change — check their site for the latest.
        </p>
      </section>

      <section aria-labelledby="fit-heading" className="mt-16 grid gap-4 sm:grid-cols-2">
        <h2 id="fit-heading" className="sr-only">
          Which one should you use?
        </h2>
        <FitList title={`Choose ${SITE_NAME} if`} items={alt.chooseUs} />
        <FitList title={`Choose ${alt.name} if`} items={alt.chooseThem} />
      </section>

      <section aria-labelledby="tools-heading" className="mt-16">
        <h2 id="tools-heading" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {SITE_NAME} tools that replace {alt.name}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alt.tools.map((id) => {
            const tool = getTool(id);
            const Icon = tool.icon;
            return (
              <li key={id} data-section={tool.section}>
                <Link
                  to={tool.href}
                  className="flex h-full gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">{tool.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="faq-heading" className="mt-16">
        <h2 id="faq-heading" className="mb-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Questions
        </h2>
        <FaqList faqs={alt.faqs} />
      </section>

      <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        Also compared:{' '}
        {others.map((other, i) => (
          <span key={other.slug}>
            {i > 0 && ' · '}
            <Link
              to="/alternatives/$slug"
              params={{ slug: other.slug }}
              className="text-foreground underline underline-offset-2"
            >
              {other.name} alternative
            </Link>
          </span>
        ))}
      </p>
    </div>
  );
}

function FitList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-1 size-4 shrink-0 text-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
