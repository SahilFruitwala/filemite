import { useEffect, useRef, useState } from "react";
import { CalendarDays, Trash2, Undo2, X } from "lucide-react";

import { ColorSwatches } from "@/components/tool/color-swatches";
import {
  ActionPanel,
  FileRow,
  Message,
  Panel,
  ResultPanel,
  Slider,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { PageEditor, type ToolStyle } from "@/features/pdf/components/page-editor";
import { SignatureMaker, type Signature } from "@/features/pdf/components/signature-maker";
import { SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import { useEditorItems } from "@/features/pdf/hooks/use-editor-items";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { newId, toOverlays, type EditorTool } from "@/features/pdf/lib/editor-items";
import { addOverlaysToFile, getPageSize } from "@/features/pdf/lib/engine";
import { centeredBox } from "@/features/pdf/lib/overlay-geometry";
import { useJob } from "@/hooks/use-job";
import { downloadFile, type OutputFile } from "@/lib/download";
import { baseName, plural } from "@/lib/format";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-sign");

/** A signature starts at this share of the page width. */
const DEFAULT_WIDTH_SHARE = 0.28;

const STYLE: ToolStyle = {
  color: "#111111",
  fill: null,
  strokeWidth: 2,
  fontSize: 12,
  markSize: 18,
};

export function SignTool() {
  const documents = usePdfDocuments({ multiple: false });
  const editor = useEditorItems();
  const job = useJob<OutputFile & { pageCount: number }>();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tool_, setTool] = useState<EditorTool>("select");
  const [textColor, setTextColor] = useState("#111111");
  const urls = useRef<string[]>([]);

  useEffect(() => {
    urls.current = signatures.map((signature) => signature.url);
  }, [signatures]);
  useEffect(
    () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
    []
  );

  const doc = documents.documents[0];
  const selected = editor.items.find((item) => item.id === selectedId) ?? null;
  const pageIndex = doc?.pageCount ? Math.min(page, doc.pageCount - 1) : 0;

  const reset = () => {
    job.reset();
    editor.clear();
    setPage(0);
    setSelectedId(null);
    setEditingId(null);
  };

  const documentsApi = {
    ...documents,
    add: (files: File[]) => {
      reset();
      documents.add(files);
    },
    clear: () => {
      reset();
      documents.clear();
    },
  };

  const place = async (signature: Signature) => {
    if (!doc || doc.status !== "ready") return;
    const [width, height] = await getPageSize(doc.id, pageIndex);
    const w = Math.min(width * DEFAULT_WIDTH_SHARE, width);
    const h = w / signature.aspect;
    const id = newId();
    job.reset();
    editor.add({
      id,
      kind: "image",
      page: pageIndex,
      png: signature.png,
      url: signature.url,
      ...centeredBox({ x: width / 2, y: height * 0.7 }, w, h, { width, height }),
    });
    setSelectedId(id);
    setTool("select");
  };

  const addDate = async () => {
    if (!doc || doc.status !== "ready") return;
    const [width, height] = await getPageSize(doc.id, pageIndex);
    const id = newId();
    job.reset();
    editor.add({
      id,
      kind: "text",
      page: pageIndex,
      x: width * 0.1,
      y: height * 0.8,
      size: 12,
      color: textColor,
      text: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    });
    setSelectedId(id);
    setTool("select");
  };

  const overlays = toOverlays(editor.items);
  const disabledReason =
    !doc || doc.status !== "ready"
      ? "Add a PDF first."
      : overlays.length === 0
        ? "Place your signature on a page first."
        : null;

  const run = () => {
    if (!doc) return;
    void job.run(async () => ({
      name: `${baseName(doc.file.name)}-signed.pdf`,
      bytes: await addOverlaysToFile({ file: doc.file, password: doc.password }, overlays),
      pageCount: doc.pageCount ?? 0,
    }));
  };

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(ready) => (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {editor.items.length
              ? "Drag your signature into place. Drag a corner to resize it."
              : "Make your signature on the right, then place it on the page."}
          </p>
          <PageEditor
            docId={ready.id}
            pageCount={ready.pageCount}
            pageIndex={pageIndex}
            onPageChange={(next) => {
              setPage(next);
              setSelectedId(null);
            }}
            editor={editor}
            tool={tool_}
            style={{ ...STYLE, color: textColor }}
            selectedId={selectedId}
            onSelect={setSelectedId}
            editingId={editingId}
            onEditing={setEditingId}
            onToolChange={setTool}
            ariaLabel="PDF page. Drag a signature to move it."
          />
        </div>
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;

  const sidebar = result ? (
    <ResultPanel
      title="Your signed PDF is ready"
      onDownload={() => downloadFile(result)}
      onStartOver={documentsApi.clear}
    >
      <FileRow
        name={result.name}
        detail={outputDetail(result.bytes, result.pageCount)}
        onDownload={() => downloadFile(result)}
      />
    </ResultPanel>
  ) : (
    <>
      <Panel title="Your signature">
        <SignatureMaker
          onCreate={(signature) => {
            setSignatures((existing) => [...existing, signature]);
            void place(signature);
          }}
        />
      </Panel>

      {signatures.length > 0 && (
        <Panel title="Place on this page">
          <ul className="space-y-2">
            {signatures.map((signature, index) => (
              <li key={signature.url} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!doc || doc.status !== "ready"}
                  onClick={() => void place(signature)}
                  aria-label={`Place signature ${index + 1} on page ${pageIndex + 1}`}
                  className="bg-checker flex h-14 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border p-1.5 transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
                >
                  <img src={signature.url} alt="" className="max-h-full max-w-full object-contain" />
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Forget signature ${index + 1}`}
                  onClick={() => {
                    URL.revokeObjectURL(signature.url);
                    setSignatures((existing) => existing.filter((item) => item !== signature));
                  }}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Kept only in this tab — never saved or uploaded.
          </p>
        </Panel>
      )}

      <Panel
        title="Also add"
        action={
          <Button variant="ghost" size="xs" disabled={!editor.canUndo} onClick={() => { job.reset(); editor.undo(); }}>
            <Undo2 />
            Undo
          </Button>
        }
      >
        <div className="space-y-4">
          <Button variant="outline" block disabled={!doc || doc.status !== "ready"} onClick={() => void addDate()}>
            <CalendarDays />
            Today’s date
          </Button>
          {selected?.kind === "text" && (
            <>
              <ColorSwatches
                label="Text colour"
                value={selected.color}
                onChange={(next) => {
                  setTextColor(next);
                  editor.patch(selected.id, { color: next });
                }}
              />
              <Slider
                label="Text size"
                value={selected.size}
                min={6}
                max={36}
                format={(value) => `${value} pt`}
                onChange={(next) => editor.patch(selected.id, { size: next })}
              />
            </>
          )}
          {selected && (
            <Button
              variant="danger"
              block
              onClick={() => {
                job.reset();
                editor.remove(selected.id);
                setSelectedId(null);
              }}
            >
              <Trash2 />
              Remove {selected.kind === "image" ? "this signature" : "this text"}
            </Button>
          )}
        </div>
      </Panel>

      {editor.items.length > 0 && !result && (
        <Message tone="info">
          {plural(overlays.length, "item")} placed. Use the page arrows to sign other pages.
        </Message>
      )}

      <ActionPanel label="Save signed PDF" disabledReason={disabledReason} job={job.state} onRun={run} />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        This adds an image of your signature to the page. It isn’t a certificate-based digital
        signature.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!doc} />;
}
