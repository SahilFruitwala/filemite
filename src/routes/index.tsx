import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Cloud, Gauge, Laptop, LockKeyhole, UserX } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { IMAGES_PER_HOUR, MAX_IMAGE_BATCH, MAX_IMAGE_BYTES } from '@/lib/limits';
import { seoHead } from '@/lib/seo';
import { SITE_DESCRIPTION, SITE_NAME, SOURCE_URL } from '@/lib/site';
import { SECTIONS, toolsIn, type Section } from '@/lib/tools';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  head: () =>
    seoHead({
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      keywords: ['image compressor', 'merge pdf', 'compress pdf', 'resize image', 'remove exif'],
      path: '/',
    }),
  component: HomePage,
});

const PROMISES = [
  {
    icon: LockKeyhole,
    title: 'Nothing is stored',
    text: 'Images are processed in memory and discarded the moment you get the result. PDFs never leave your device at all.',
  },
  {
    icon: UserX,
    title: 'No account, no watermark',
    text: 'Open a tool and use it. No sign-up, no email, nothing stamped on your files.',
  },
  {
    icon: Gauge,
    title: 'Fast for everyone',
    text: `Fair-use limits — ${MAX_IMAGE_BATCH} images per batch, ${formatBytes(MAX_IMAGE_BYTES)} each, ${IMAGES_PER_HOUR} an hour — keep the servers quick for every visitor.`,
  },
];

function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="bg-glow absolute inset-0" />
        <div
          aria-hidden
          className="bg-dots absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:px-8">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pr-3 pl-1 text-xs text-muted-foreground shadow-xs backdrop-blur">
              <span className="rounded-full bg-foreground px-2 py-0.5 font-mono text-[11px] text-background">
                {toolsIn('image').length + toolsIn('pdf').length} tools
              </span>
              Free · no sign-up · nothing stored
            </p>
            <h1 className="font-display text-[2.9rem] leading-[0.98] font-bold tracking-tighter sm:text-6xl lg:text-[5.25rem]">
              Tiny tools for
              <br />
              <span className="text-gradient">mighty files.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Compress, resize and clean up images. Merge, split and shrink PDFs. Focused tools that
              do one job well — free, private and instant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={SECTIONS.image.href}
                data-section="image"
                className={buttonVariants({ size: 'xl' })}
              >
                Compress images
                <ArrowRight />
              </Link>
              <Link
                to={SECTIONS.pdf.href}
                data-section="pdf"
                className={buttonVariants({ size: 'xl' })}
              >
                Merge PDFs
                <ArrowRight />
              </Link>
            </div>
          </div>

          <HeroSpecimen />
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-16 px-4 pt-14 sm:space-y-20 sm:px-6 sm:pt-20 lg:px-8">
        <SectionGrid section="image" />
        <SectionGrid section="pdf" />

        <section className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border shadow-sm md:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-card p-6 sm:p-8">
              <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/60 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Free software</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Every line is public under the AGPL. Read how your files are handled, or run your own
              copy.
            </p>
          </div>
          <a href={SOURCE_URL} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            View source
            <ArrowUpRight />
          </a>
        </section>
      </div>
    </>
  );
}

function SectionGrid({ section }: { section: Section }) {
  const meta = SECTIONS[section];
  const list = toolsIn(section);
  return (
    <section data-section={section} aria-labelledby={`${section}-heading`}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="inline-flex size-1.5 rounded-full bg-primary" />
            {meta.label} · {String(list.length).padStart(2, '0')} tools
          </p>
          <h2
            id={`${section}-heading`}
            className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {meta.title}
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
          {meta.description}
        </p>
      </div>

      <div
        className={cn(
          'grid gap-3 sm:grid-cols-2',
          list.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
        )}
      >
        {list.map((tool, index) => {
          const Icon = tool.icon;
          const Where = tool.processing === 'browser' ? Laptop : Cloud;
          return (
            <Link
              key={tool.id}
              to={tool.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-200 before:pointer-events-none before:absolute before:-top-16 before:-right-16 before:size-40 before:rounded-full before:bg-primary before:opacity-0 before:blur-3xl before:transition-opacity hover:-translate-y-1 hover:border-primary-line hover:shadow-lg hover:before:opacity-15"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-[11px] text-subtle">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                {tool.title}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
                {tool.description}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Where className="size-3.5" />
                  {tool.processing === 'browser' ? 'In your browser' : 'In memory'}
                </span>
                <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Decorative "before → after" readout that shows what the tools do at a glance. */
function HeroSpecimen() {
  const rows = [
    { section: 'image' as const, name: 'holiday-0142.heic', from: 4.2, to: 0.61 },
    { section: 'image' as const, name: 'banner@2x.png', from: 2.9, to: 0.38 },
    { section: 'pdf' as const, name: 'contract-scan.pdf', from: 18.4, to: 2.7 },
  ];
  return (
    <div
      aria-hidden
      className="animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-border bg-card/90 p-2.5 shadow-lg backdrop-blur delay-150 duration-700 fill-mode-both lg:rotate-1"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="eyebrow">filemite.com</span>
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((row) => {
          const saved = Math.round((1 - row.to / row.from) * 100);
          return (
            <li
              key={row.name}
              data-section={row.section}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{row.name}</span>
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] font-medium text-primary">
                  −{saved}%
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${100 - saved}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>{row.from} MB</span>
                <span className="text-foreground">{row.to} MB</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
