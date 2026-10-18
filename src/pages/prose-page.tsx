/** Layout for long-form pages such as Privacy and Terms. */
export function ProsePage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">{intro}</p>
      <ol className="mt-12 space-y-10 border-t border-border pt-10">
        {sections.map((section, index) => (
          <li key={section.heading} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
            <span className="font-mono text-sm text-subtle">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-3 leading-7 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2">
                {section.body}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-12 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
        Last updated {updated}
      </p>
    </div>
  );
}
