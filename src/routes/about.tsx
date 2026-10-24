import { createFileRoute } from '@tanstack/react-router';

import { ProsePage } from '@/pages/prose-page';
import { seoHead } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
import { aboutPage } from '@/lib/trust-content';

export const Route = createFileRoute('/about')({
  head: () =>
    seoHead({
      title: `About ${SITE_NAME}`,
      description: `What ${SITE_NAME} is: free Filemite PDF tools and image tools that stay private — no sign-up, nothing stored, open source.`,
      path: '/about',
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <ProsePage
      eyebrow="About"
      title={aboutPage.title}
      intro={aboutPage.intro}
      updated={aboutPage.updated}
      sections={aboutPage.sections.map((section) => ({
        heading: section.heading,
        body: <p>{section.body}</p>,
      }))}
    />
  );
}
