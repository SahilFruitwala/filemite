import { parseMarkdown } from '@tanstack/markdown';
import type { MarkdownDocument } from '@tanstack/markdown';

/**
 * Blog posts are Markdown files in /content/blog. Each file name is the post's slug
 * and starts with a frontmatter block:
 *
 *   ---
 *   title: Post title
 *   description: One sentence for search results and social cards.
 *   date: 2026-11-09
 *   tags: one, two, three
 *   image: /blog/<slug>/cover.png   (optional, defaults to the site card)
 *   ---
 *
 * Images live in /public/blog/<slug>/ and are linked as /blog/<slug>/name.png.
 * Posts are bundled at build time, so there is no CMS or database.
 */

export interface Post {
  slug: string;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  tags: string[];
  image?: string;
  /** Parsed Markdown tree, rendered to React by the post route. */
  doc: MarkdownDocument;
  readingMinutes: number;
}

const files = import.meta.glob<string>('/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Reads the small `key: value` frontmatter subset the posts use. */
function parseFrontmatter(source: string) {
  const data: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const value = line.slice(sep + 1).trim();
    data[line.slice(0, sep).trim()] = value.replace(/^(["'])(.*)\1$/, '$2');
  }
  return data;
}

function toPost(path: string, raw: string): Post {
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  const doc = parseMarkdown(raw, { frontmatter: true, headingIds: true });
  if (!doc.frontmatter) throw new Error(`${path}: missing frontmatter`);
  const data = parseFrontmatter(doc.frontmatter);
  const body = raw.replace(/^---[\s\S]*?\n---/, '');
  for (const key of ['title', 'description', 'date'] as const) {
    if (!data[key]) throw new Error(`${path}: frontmatter needs "${key}"`);
  }
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    image: data.image || undefined,
    doc,
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

/** Every post, newest first. */
export const posts: Post[] = Object.entries(files)
  .map(([path, raw]) => toPost(path, raw))
  .sort((a, b) => b.date.localeCompare(a.date));

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function formatPostDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
