import { useEffect } from "react";

import { ToolPage } from "@/components/tool/tool-page";
import { warmupEngine } from "@/features/pdf/lib/engine";
import type { Tool } from "@/lib/tools";

/** Tool page that starts downloading the PDF engine while the user picks a file. */
export function PdfToolPage({ tool, children }: { tool: Tool; children: React.ReactNode }) {
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(warmupEngine);
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(warmupEngine, 200);
    return () => clearTimeout(handle);
  }, []);

  return <ToolPage tool={tool}>{children}</ToolPage>;
}
