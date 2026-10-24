import { Link } from '@tanstack/react-router';

import { FaqList } from '@/components/tool/faq-list';
import { toolContent } from '@/lib/tool-content';
import { SECTIONS, toolsIn, type Tool } from '@/lib/tools';

/** Plain-language explanation under a tool: what it does, how to use it, common questions. */
export function ToolGuide({ tool }: { tool: Tool }) {
  const { summary, steps, faqs } = toolContent[tool.id];
  const related = toolsIn(tool.section).filter((item) => item.id !== tool.id);

  return (
    <div className="mt-16 grid gap-12 border-t border-border pt-12 lg:grid-cols-[1fr_1.2fr]">
      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-display text-2xl font-bold tracking-tight">
          How to use {tool.title.toLowerCase()}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{summary}</p>
        <ol className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-4">
          <FaqList faqs={faqs} />
        </div>
      </section>

      <nav aria-labelledby="related-heading" className="lg:col-span-2">
        <h2 id="related-heading" className="font-display text-xl font-bold tracking-tight">
          More {SECTIONS[tool.section].label} tools
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {related.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="inline-block rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
