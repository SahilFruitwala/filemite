import { createFileRoute } from '@tanstack/react-router';
import { SITE_URL } from '@/lib/seo';

const PRIVATE = 'Disallow: /api/\nDisallow: /ingest/';

/**
 * AI search and user-request crawlers are named so the policy is explicit. A crawler with
 * its own group ignores the `*` group, so each one repeats the private paths. Training
 * crawlers (GPTBot, ClaudeBot, Google-Extended) are deliberately not listed and fall under `*`.
 */
const AI_SEARCH_AGENTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
];

export const robotsTxt = [
  `User-agent: *\nAllow: /\n${PRIVATE}`,
  ...AI_SEARCH_AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /\n${PRIVATE}`),
  `Sitemap: ${SITE_URL}/sitemap.xml`,
].join('\n\n') + '\n';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(robotsTxt, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        }),
    },
  },
});
