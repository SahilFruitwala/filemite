import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Cloud, Gauge, Laptop, LockKeyhole, UserX } from 'lucide-react';

import { HeroDemo } from '@/components/home/hero-demo';
import JsonLd from '@/components/JsonLd';
import { FaqList } from '@/components/tool/faq-list';
import { buttonVariants } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { IMAGES_PER_HOUR, MAX_IMAGE_BATCH, MAX_IMAGE_BYTES } from '@/lib/limits';
import { HOME_TITLE, homeJsonLd, seoHead } from '@/lib/seo';
import { SITE_DESCRIPTION } from '@/lib/site';
import { siteFaqs } from '@/lib/tool-content';
import { SECTIONS, toolsIn, type Section } from '@/lib/tools';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  head: () =>
    seoHead({
      title: HOME_TITLE,
      description: SITE_DESCRIPTION,
      keywords: [
        'Filemite PDF tools',
        'Filemite',
        'PDF tools',
        'image compressor',
        'merge pdf',
        'compress pdf',
        'resize image',
        'remove exif',
        'private pdf tools',
        'free image tools',
      ],
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
      <JsonLd data={homeJsonLd()} />
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="bg-glow animate-drift absolute -inset-[5%]" />
        <div
          aria-hidden
          className="bg-dots absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:px-8">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <ul className="mb-7 flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-semibold tracking-wide uppercase">
              {[
                { text: `${toolsIn('image').length + toolsIn('pdf').length} tools`, cls: 'bg-foreground text-background -rotate-3' },
                { text: '100% free', cls: 'bg-sun text-ink rotate-2' },
                { text: 'no sign-up', cls: 'bg-mint text-ink -rotate-1' },
                { text: 'nothing stored', cls: 'bg-card text-foreground rotate-3' },
              ].map((sticker, i) => (
                <li
                  key={sticker.text}
                  style={{ animationDelay: `${200 + i * 90}ms` }}
                  className={cn(
                    'animate-pop hover-wiggle rounded-md border-2 border-ink px-2.5 py-1 shadow-pop-sm',
                    sticker.cls,
                  )}
                >
                  {sticker.text}
                </li>
              ))}
            </ul>
            <h1 className="font-display text-[2.9rem] leading-[0.98] font-bold tracking-tighter sm:text-6xl lg:text-[5.25rem]">
              Filemite PDF tools
              <br />
              <span className="squiggle">
                <span className="text-gradient text-gradient-animated">& image tools.</span>
                <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden>
                  <path
                    d="M3 12 C 30 2, 50 18, 78 10 S 125 2, 152 11 S 205 19, 232 9 S 280 4, 297 10"
                    fill="none"
                    stroke="var(--sun)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-2 text-lg leading-8 text-muted-foreground delay-150 duration-700 fill-mode-both">
              Compress, convert and mark up images. Merge, sign, redact and shrink PDFs. Small,
              focused tools that each do one job really well. Free, private, and fast enough that
              you'll forget to make tea.
            </p>
            <div className="mt-8 flex animate-in fade-in slide-in-from-bottom-2 flex-wrap gap-3 delay-300 duration-700 fill-mode-both">
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

          <HeroDemo />
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-16 px-4 pt-14 sm:space-y-20 sm:px-6 sm:pt-20 lg:px-8">
        <SectionGrid section="image" />
        <SectionGrid section="pdf" />

        <section className="reveal grid gap-5 md:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className={cn(
                'sticker rounded-2xl p-6 sm:p-8',
                ['bg-sun/35 md:-rotate-1', 'bg-mint/35 md:rotate-1', 'bg-card md:-rotate-[0.5deg]'][i],
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-foreground text-background shadow-pop-sm transition-transform duration-300 hover:scale-110 hover:-rotate-12">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="faq-heading" className="reveal mx-auto max-w-3xl pb-4">
          <h2
            id="faq-heading"
            className="mb-6 font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Questions, answered
          </h2>
          <FaqList faqs={siteFaqs} />
        </section>
      </div>
    </>
  );
}

function SectionGrid({ section }: { section: Section }) {
  const meta = SECTIONS[section];
  const list = toolsIn(section);
  return (
    <section data-section={section} aria-labelledby={`${section}-heading`} className="reveal">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">
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
              style={
                {
                  animationDelay: `${index * 60}ms`,
                  '--tilt': index % 2 ? '0.8deg' : '-0.8deg',
                } as React.CSSProperties
              }
              className="sticker group relative animate-in fade-in slide-in-from-bottom-3 fill-mode-both flex flex-col overflow-hidden rounded-2xl bg-card p-5"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border-2 border-ink bg-primary-soft text-primary transition-[background-color,color,transform] duration-300 group-hover:-rotate-12 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
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
                <span className="flex size-7 items-center justify-center rounded-full border-2 border-ink bg-primary text-primary-foreground opacity-0 transition-[opacity,transform] -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100">
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
