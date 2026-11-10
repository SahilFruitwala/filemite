import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { formatPostDate, posts } from '@/lib/blog';
import { seoHead } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const Route = createFileRoute('/blog/')({
  head: () =>
    seoHead({
      title: 'Blog — Image and PDF Tips',
      description: `Guides and tool round-ups from ${SITE_NAME}: compress images, work with PDFs and make your pages load faster.`,
      path: '/blog',
    }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow mb-3">Blog</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Notes and guides</h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">
        Practical posts on images, PDFs and faster pages.
      </p>
      <ul className="mt-12 space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <span>
                <span className="eyebrow block">
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read
                </span>
                <span className="mt-2 block font-display text-xl font-semibold tracking-tight">{post.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{post.description}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
