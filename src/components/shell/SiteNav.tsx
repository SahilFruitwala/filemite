import {
  TopNav,
  TopNavHeading,
  TopNavItem,
} from '@astryxdesign/core/TopNav';
import { useRouterState } from '@tanstack/react-router';
import { ThemeToggle } from './mode';

const navItems = [
  { href: '/', label: 'Compress' },
  { href: '/convert', label: 'Convert' },
  { href: '/crop', label: 'Crop' },
  { href: '/scrub', label: 'Scrub' },
  { href: '/palette', label: 'Palette' },
  { href: '/favicon', label: 'Favicon' },
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
          {navItems.map((item) => (
            <TopNavItem
              key={item.href}
              label={item.label}
              href={item.href}
              isSelected={pathname === item.href}
            />
          ))}
        </>
      }
      endContent={<ThemeToggle />}
    />
  );
}
