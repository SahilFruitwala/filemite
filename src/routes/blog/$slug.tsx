import { Markdown, type MarkdownComponents } from '@tanstack/markdown/react';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import JsonLd from '@/components/JsonLd';
import { formatPostDate, getPost } from '@/lib/blog';
import { blogPostJsonLd, seoHead } from '@/lib/seo';
import { AUTHOR } from '@/lib/site';

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) =>
    loaderData
      ? seoHead({
          title: loaderData.title,
          description: loaderData.description,
          keywords: loaderData.tags,
          path: `/blog/${loaderData.slug}`,
          image: loaderData.image,
          type: 'article',
          publishedTime: loaderData.date,
        })
      : {},
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <JsonLd data={blogPostJsonLd(post)} />

      <nav aria-label="Breadcrumb" className="eyebrow mb-3">
        <Link to="/blog" className="hover:text-foreground">
          Blog
        </Link>{' '}
        / <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read
      </nav>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{post.title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        By{' '}
        <a href={AUTHOR.url} className="text-foreground underline underline-offset-2">
          {AUTHOR.name}
        </a>
      </p>

      <div className="blog-prose mt-10">
        <Markdown components={components}>{post.doc}</Markdown>
      </div>

      {post.tags.length > 0 && (
        <ul className="mt-12 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Images load lazily; links to other sites open in a new tab. */
const components: MarkdownComponents = {
  img: (props) => <img {...props} alt={props.alt ?? ''} loading="lazy" decoding="async" />,
  a: ({ href = '', ...props }) => {
    const external = /^https?:\/\//.test(href) && !href.startsWith('https://www.filemite.com');
    return external ? <a href={href} rel="noopener" target="_blank" {...props} /> : <a href={href} {...props} />;
  },
};
