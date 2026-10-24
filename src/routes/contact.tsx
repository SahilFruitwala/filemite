import { createFileRoute } from '@tanstack/react-router';

import { ProsePage } from '@/pages/prose-page';
import { seoHead } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
import { contactPage } from '@/lib/trust-content';

export const Route = createFileRoute('/contact')({
  head: () =>
    seoHead({
      title: 'Contact',
      description: `How to contact ${SITE_NAME} for support, bug reports and questions about Filemite PDF tools and image tools.`,
      path: '/contact',
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <ProsePage
      eyebrow="Contact"
      title={contactPage.title}
      intro={contactPage.intro}
      updated={contactPage.updated}
      sections={contactPage.sections.map((section) => ({
        heading: section.heading,
        body: <p>{section.body}</p>,
      }))}
    />
  );
}
