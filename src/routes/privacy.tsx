import { createFileRoute, Link } from '@tanstack/react-router';

import { ProsePage } from '@/pages/prose-page';
import { seoHead } from '@/lib/seo';
import { SITE_NAME, SOURCE_URL } from '@/lib/site';
import { tools } from '@/lib/tools';

export const Route = createFileRoute('/privacy')({
  head: () =>
    seoHead({
      title: 'Privacy Policy',
      description: `How ${SITE_NAME} handles your images and PDFs: processed in memory or on your device, never stored.`,
      path: '/privacy',
    }),
  component: PrivacyPage,
});

const names = (processing: 'server' | 'browser') =>
  tools
    .filter((tool) => tool.processing === processing)
    .map((tool) => tool.title)
    .join(', ');

function PrivacyPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Privacy"
      intro="Your files are yours. Here is exactly what happens to them."
      updated="October 19, 2026"
      sections={[
        {
          heading: 'Server tools process in memory',
          body: (
            <p>
              {names('server')} upload your image to our server, where it is processed in memory
              with Sharp and streamed straight back. Images are never written to disk or object
              storage, and nothing is kept once the request finishes.
            </p>
          ),
        },
        {
          heading: 'Browser tools never upload',
          body: (
            <p>
              {names('browser')} run entirely on your device. Your images and PDFs — including any
              PDF passwords you enter — are never sent to us.
            </p>
          ),
        },
        {
          heading: 'Abuse protection',
          body: (
            <p>
              To keep the service fast for everyone, the server counts requests per IP address in
              memory for a few minutes. These counters are not logged or shared and disappear on
              their own.
            </p>
          ),
        },
        {
          heading: 'Analytics',
          body: (
            <p>
              We use PostHog for anonymous usage analytics — for example, that a compression
              finished, which preset was used and how much smaller the file got. We never send file
              contents or file names, there are no session recordings, and your IP address is
              stripped before events reach PostHog.
            </p>
          ),
        },
        {
          heading: 'Open source',
          body: (
            <p>
              You don’t have to take our word for it: the full <a href={SOURCE_URL}>source code</a>{' '}
              is public. See also the <Link to="/terms">terms of service</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
