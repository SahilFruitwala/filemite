import { createFileRoute } from '@tanstack/react-router';
import { seoHead } from '@/lib/seo';
import PrivacyPage from '@/tools/PrivacyPage';

export const Route = createFileRoute('/privacy')({
  head: () =>
    seoHead({
      title: 'Privacy Policy',
      description: "Learn how MicroPNG handles your data. Spoiler: We don't store your images.",
      path: '/privacy',
    }),
  component: PrivacyPage,
});
