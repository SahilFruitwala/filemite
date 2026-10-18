import { useCallback, useEffect, useRef, useState } from "react";

import { closeDocument, EngineError, openDocument } from "@/features/pdf/lib/engine";
import { formatBytes } from "@/lib/format";
import { MAX_PDF_BYTES } from "@/lib/limits";

export const MAX_FILE_BYTES = MAX_PDF_BYTES;
export const PDF_ACCEPT = "application/pdf,.pdf";
export const PDF_HINT = `PDF · up to ${formatBytes(MAX_FILE_BYTES)}`;
export const PDF_HINT_MULTIPLE = `PDF · up to ${formatBytes(MAX_FILE_BYTES)} each`;

export type PdfDocument = {
  id: string;
  file: File;
  status: "opening" | "locked" | "ready" | "error";
  pageCount?: number;
  password?: string;
  error?: string;
};

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/**
 * Tracks the PDFs a tool is working on. Each document is opened in the
 * preview worker as soon as it's added, so page counts, thumbnails and
 * password prompts are ready before the user runs the tool.
 */
export function usePdfDocuments({ multiple }: { multiple: boolean }) {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const openIds = useRef(new Set<string>());

  const update = useCallback((id: string, patch: Partial<PdfDocument>) => {
    setDocuments((docs) =>
      docs.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
    );
  }, []);

  const open = useCallback(
    (doc: PdfDocument, password?: string) => {
      openIds.current.add(doc.id);
      openDocument(doc.id, doc.file, password).then(
        ({ pageCount }) => {
          if (!openIds.current.has(doc.id)) return closeDocument(doc.id);
          update(doc.id, { status: "ready", pageCount, password, error: undefined });
        },
        (error: unknown) => {
          if (!openIds.current.has(doc.id)) return;
          if (error instanceof EngineError && error.code === "password") {
            update(doc.id, {
              status: "locked",
              error: password ? "Incorrect password. Try again." : undefined,
            });
          } else {
            update(doc.id, {
              status: "error",
              error: error instanceof Error ? error.message : "Couldn’t open this file.",
            });
          }
        }
      );
    },
    [update]
  );

  const close = useCallback((id: string) => {
    if (openIds.current.delete(id)) closeDocument(id);
  }, []);

  const add = useCallback(
    (files: File[]) => {
      const accepted: PdfDocument[] = [];
      const problems: string[] = [];

      for (const file of files) {
        if (!isPdf(file)) {
          problems.push(`“${file.name}” isn’t a PDF.`);
        } else if (file.size > MAX_FILE_BYTES) {
          problems.push(
            `“${file.name}” is larger than ${formatBytes(MAX_FILE_BYTES)}.`
          );
        } else {
          accepted.push({ id: crypto.randomUUID(), file, status: "opening" });
        }
        if (!multiple && accepted.length) break;
      }

      setNotice(problems.length ? problems.join(" ") : null);
      if (!accepted.length) return;

      if (multiple) {
        setDocuments((docs) => [...docs, ...accepted]);
      } else {
        openIds.current.forEach((id) => closeDocument(id));
        openIds.current.clear();
        setDocuments(accepted);
      }
      accepted.forEach((doc) => open(doc));
    },
    [multiple, open]
  );

  const unlock = useCallback(
    (id: string, password: string) => {
      const doc = documents.find((item) => item.id === id);
      if (!doc) return;
      update(id, { status: "opening", error: undefined });
      open(doc, password);
    },
    [documents, open, update]
  );

  const remove = useCallback(
    (id: string) => {
      close(id);
      setDocuments((docs) => docs.filter((doc) => doc.id !== id));
    },
    [close]
  );

  const clear = useCallback(() => {
    openIds.current.forEach((id) => closeDocument(id));
    openIds.current.clear();
    setDocuments([]);
    setNotice(null);
  }, []);

  useEffect(() => {
    const ids = openIds.current;
    return () => {
      ids.forEach((id) => closeDocument(id));
      ids.clear();
    };
  }, []);

  return { documents, setDocuments, notice, add, unlock, remove, clear };
}
