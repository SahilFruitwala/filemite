import { FileText, FileUp, Loader2, X } from "lucide-react";

import { AddFilesButton, DropTarget, FileDrop } from "@/components/tool/file-drop";
import { PasswordForm } from "@/features/pdf/components/password-form";
import { Message } from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import {
  PDF_ACCEPT,
  PDF_HINT,
  type PdfDocument,
  type usePdfDocuments,
} from "@/features/pdf/hooks/use-pdf-documents";
import { formatBytes, plural } from "@/lib/format";
import type { Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

type Documents = ReturnType<typeof usePdfDocuments>;

/**
 * Workspace shell for tools that take one PDF: upload, password unlock and
 * error states, then `children` once the document is ready.
 */
export function SingleDocumentWorkspace({
  documents,
  tool,
  children,
}: {
  documents: Documents;
  tool: Tool;
  children: (doc: PdfDocument & { pageCount: number }) => React.ReactNode;
}) {
  const doc = documents.documents[0];

  if (!doc) {
    return (
      <div className="space-y-3">
        <FileDrop
          accept={PDF_ACCEPT}
          hint={PDF_HINT}
          icon={FileUp}
          multiple={false}
          onFiles={documents.add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose PDF"
        />
        {documents.notice && <Message tone="error">{documents.notice}</Message>}
      </div>
    );
  }

  return (
    <DropTarget onFiles={documents.add} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.file.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground tabular">
            {formatBytes(doc.file.size)}
            {doc.pageCount !== undefined && ` · ${plural(doc.pageCount, "page")}`}
          </p>
        </div>
        <AddFilesButton accept={PDF_ACCEPT} multiple={false} onFiles={documents.add} label="Replace" />
        <Button variant="ghost" size="icon" aria-label="Remove file" onClick={documents.clear}>
          <X />
        </Button>
      </div>

      {documents.notice && <Message tone="error">{documents.notice}</Message>}

      {doc.status === "opening" && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-card py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Opening PDF…
        </div>
      )}

      {doc.status === "locked" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <PasswordForm
            fileName={doc.file.name}
            error={doc.error}
            onSubmit={(password) => documents.unlock(doc.id, password)}
          />
        </div>
      )}

      {doc.status === "error" && <Message tone="error">{doc.error}</Message>}

      {doc.status === "ready" && doc.pageCount !== undefined &&
        children(doc as PdfDocument & { pageCount: number })}
    </DropTarget>
  );
}

export function PageGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-5 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]",
        className
      )}
    >
      {children}
    </div>
  );
}
