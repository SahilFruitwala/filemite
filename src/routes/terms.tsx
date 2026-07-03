import { createFileRoute } from '@tanstack/react-router';
import { seoHead } from '@/lib/seo';
import TermsPage from '@/tools/TermsPage';

export const Route = createFileRoute('/terms')({
  head: () =>
    seoHead({
      title: 'Terms of Service',
      description: 'The terms of service for using MicroPNG image tools.',
      path: '/terms',
    }),
  component: TermsPage,
});
