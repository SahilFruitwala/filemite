import { createFileRoute } from '@tanstack/react-router';

import { ProsePage } from '@/pages/prose-page';
import { seoHead } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
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
            <>
              <p>
                We use PostHog for anonymous usage analytics, sent through our own server so your
                browser only talks to {SITE_NAME}. We collect:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Page views and the page you leave, with the page address, referrer, browser, OS,
                  device type and screen size.
                </li>
                <li>
                  Tool events, for both image and PDF tools, such as a tool starting, finishing or
                  failing and how long it took. Image tools can also include the settings used
                  (such as compression level or output format), the number of files, image
                  dimensions, file sizes and how much smaller the file got. Server tools send the
                  same kind of event from our server.
                </li>
                <li>
                  Errors raised in the page, limited to the type of error and which function
                  failed. The error message is never sent, so it cannot contain a file name. This
                  helps us fix bugs.
                </li>
              </ul>
              <p>
                We never send file contents or file names. There are no session recordings, no
                autocapture of clicks or text, and no heatmaps. We do not identify visitors, and
                your IP address is removed before events reach PostHog.
              </p>
            </>
          ),
        },
        {
          heading: 'Cookies and local storage',
          body: (
            <p>
              Analytics are cookieless: the random ID PostHog uses is kept in your browser’s memory
              only and is gone when you close or reload the tab, so it cannot follow you between
              visits. The only things we store on your device are your light or dark theme choice in
              local storage and the offline cache for the installable app. Because no tracking
              cookies are set, there is no cookie banner.
            </p>
          ),
        },
      ]}
    />
  );
}
