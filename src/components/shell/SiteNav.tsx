import {
  TopNav,
  TopNavHeading,
  TopNavItem,
  TopNavMegaMenu,
  TopNavMegaMenuItem,
  TopNavMegaMenuFeaturedCard,
} from '@astryxdesign/core/TopNav';
import { useRouterState } from '@tanstack/react-router';
import { ThemeToggle } from './mode';

const tools = [
  {
    href: '/convert',
    title: 'Convert',
    description: 'PNG, JPEG, WebP, and AVIF, in any direction',
  },
  {
    href: '/resize',
    title: 'Resize',
    description: 'Exact dimensions, presets, or percentage scaling',
  },
  {
    href: '/crop',
    title: 'Smart Crop',
    description: 'Content-aware cropping with manual override',
  },
  {
    href: '/filters',
    title: 'Filters',
    description: 'Grain, duotone, and color adjustments',
  },
  {
    href: '/glass',
    title: 'Glass',
    description: 'Frosted-glass effects over any image',
  },
  {
    href: '/watermark',
    title: 'Watermark',
    description: 'Batch text and logo watermarks',
  },
  {
    href: '/scrub',
    title: 'Scrub',
    description: 'Strip EXIF and metadata from photos',
  },
  {
    href: '/palette',
    title: 'Palette',
    description: 'Extract dominant colors from an image',
  },
  {
    href: '/pdf',
    title: 'PDF Tools',
    description: 'Images to PDF and back again',
  },
];

export default function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <TopNav
      label="Main navigation"
      heading={
        <TopNavHeading
          heading="MicroPNG"
          logo={
            <img
              src="/icon.webp"
              alt=""
              width={28}
              height={28}
              className="rounded-lg"
            />
          }
          href="/"
        />
      }
      startContent={
        <>
          <TopNavItem label="Compress" href="/" isSelected={pathname === '/'} />
          <TopNavMegaMenu
            label="Tools"
            items={
              <>
                {tools.map((tool) => (
                  <TopNavMegaMenuItem
                    key={tool.href}
                    title={tool.title}
                    description={tool.description}
                    href={tool.href}
                  />
                ))}
              </>
            }
            featured={
              <TopNavMegaMenuFeaturedCard
                title="Privacy first"
                description="Images are processed in-memory and never stored — most tools run entirely in your browser."
                linkLabel="Read the privacy policy"
                linkHref="/privacy"
              />
            }
          />
          <TopNavItem
            label="Favicon"
            href="/favicon"
            isSelected={pathname === '/favicon'}
          />
        </>
      }
      endContent={<ThemeToggle />}
    />
  );
}
