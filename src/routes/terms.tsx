import { createFileRoute } from '@tanstack/react-router';

import { ProsePage } from '@/pages/prose-page';
import { seoHead } from '@/lib/seo';
import { SITE_NAME, SOURCE_URL } from '@/lib/site';

export const Route = createFileRoute('/terms')({
  head: () =>
    seoHead({
      title: 'Terms of Service',
      description: `The simple rules for using ${SITE_NAME}.`,
      path: '/terms',
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Terms of service"
      intro="Simple rules for simple tools."
      updated="October 18, 2026"
      sections={[
        {
          heading: 'Using the service',
          body: (
            <p>
              By using {SITE_NAME} you agree to these terms. The service is provided free, “as is”
              and “as available”, without warranties of any kind.
            </p>
          ),
        },
        {
          heading: 'Your content',
          body: (
            <p>
              You are responsible for the files you process. Don’t use the tools for anything
              illegal or to process content that infringes other people’s rights.
            </p>
          ),
        },
        {
          heading: 'Fair use',
          body: (
            <p>
              Server-side tools are rate limited per visitor so they stay fast for everyone.
              Automated or bulk use that degrades the service for others isn’t allowed, and we may
              block traffic that does.
            </p>
          ),
        },
        {
          heading: 'Limitation of liability',
          body: (
            <p>
              To the fullest extent permitted by law, {SITE_NAME} and its creator are not liable for
              any indirect, incidental or consequential damages, or for any loss of data, arising
              from your use of the service. Keep your originals.
            </p>
          ),
        },
        {
          heading: 'License',
          body: (
            <p>
              The software is free and open source under the GNU Affero General Public License v3.0
              or later. You may use, study, modify and share it under that license — the{' '}
              <a href={SOURCE_URL}>source code</a> is public. The name and logo are not part of the
              license.
            </p>
          ),
        },
        {
          heading: 'Changes',
          body: (
            <p>
              We may update these terms from time to time. Changes are posted on this page with a
              new revision date.
            </p>
          ),
        },
      ]}
    />
  );
}
