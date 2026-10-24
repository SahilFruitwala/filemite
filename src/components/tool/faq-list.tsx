import { ChevronDown } from 'lucide-react';

import type { Faq } from '@/lib/tool-content';

/** Questions and answers as native disclosures: crawlable, keyboard friendly, no JS needed. */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {faqs.map(({ question, answer }) => (
        <details key={question} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            <h3 className="text-[15px] font-medium">{question}</h3>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
        </details>
      ))}
    </div>
  );
}
