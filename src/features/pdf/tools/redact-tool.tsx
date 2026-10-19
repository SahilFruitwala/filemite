import { useState } from "react";
import { MousePointer2, SquareDashedMousePointer, Trash2, Undo2 } from "lucide-react";

import {
  ActionPanel,
  FileRow,
  Message,
  Panel,
  ResultPanel,
  Segmented,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { PageEditor, type ToolStyle } from "@/features/pdf/components/page-editor";
import { SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import { useEditorItems } from "@/features/pdf/hooks/use-editor-items";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { countOnPage, toRedactBoxes, type EditorTool } from "@/features/pdf/lib/editor-items";
import { redactFile } from "@/features/pdf/lib/engine";
import { useJob } from "@/hooks/use-job";
import { downloadFile, type OutputFile } from "@/lib/download";
import { baseName, plural } from "@/lib/format";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-redact");

const STYLE: ToolStyle = {
  color: "#000000",
  fill: null,
  strokeWidth: 2,
  fontSize: 12,
  markSize: 18,
};

export function RedactTool() {
  const documents = usePdfDocuments({ multiple: false });
  const editor = useEditorItems();
  const job = useJob<OutputFile & { pageCount: number }>();
  const [current, setCurrent] = useState<EditorTool>("redact");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const doc = documents.documents[0];
  const pageIndex = doc?.pageCount ? Math.min(page, doc.pageCount - 1) : 0;
  const boxes = toRedactBoxes(editor.items);
  const pages = new Set(boxes.map((box) => box.page)).size;

  const reset = () => {
    job.reset();
    editor.clear();
    setPage(0);
    setSelectedId(null);
    setCurrent("redact");
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

  const removeOnPage = () => {
    job.reset();
    editor.items
      .filter((item) => item.page === pageIndex)
      .forEach((item) => editor.remove(item.id));
    setSelectedId(null);
  };

  const run = () => {
    if (!doc) return;
    void job.run(async () => ({
      name: `${baseName(doc.file.name)}-redacted.pdf`,
      bytes: await redactFile({ file: doc.file, password: doc.password }, boxes),
      pageCount: doc.pageCount ?? 0,
    }));
  };

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(ready) => (
        <PageEditor
          docId={ready.id}
          pageCount={ready.pageCount}
          pageIndex={pageIndex}
          onPageChange={(next) => {
            setPage(next);
            setSelectedId(null);
          }}
          editor={{
            ...editor,
            add: (item) => {
              job.reset();
              editor.add(item);
            },
          }}
          tool={current}
          style={STYLE}
          selectedId={selectedId}
          onSelect={setSelectedId}
          editingId={editingId}
          onEditing={setEditingId}
          onToolChange={setCurrent}
          ariaLabel="PDF page. Drag to draw a box over what to remove."
        />
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;

  const sidebar = result ? (
    <ResultPanel
      title="Your redacted PDF is ready"
      onDownload={() => downloadFile(result)}
      onStartOver={documentsApi.clear}
    >
      <FileRow
        name={result.name}
        detail={outputDetail(result.bytes, result.pageCount)}
        onDownload={() => downloadFile(result)}
      />
      <Message tone="success">
        The text, images and drawings under {plural(boxes.length, "box", "boxes")} were deleted from
        the file.
      </Message>
    </ResultPanel>
  ) : (
    <>
      <Panel
        title="Boxes to remove"
        action={
          <Button
            variant="ghost"
            size="xs"
            disabled={!editor.canUndo}
            onClick={() => {
              job.reset();
              editor.undo();
            }}
          >
            <Undo2 />
            Undo
          </Button>
        }
      >
        <div className="space-y-4">
          <Segmented
            label="Mouse mode"
            value={current === "redact" ? "redact" : "select"}
            disabled={!doc}
            onChange={(next) => setCurrent(next)}
            options={[
              {
                value: "redact",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <SquareDashedMousePointer className="size-3.5" />
                    Draw
                  </span>
                ),
              },
              {
                value: "select",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <MousePointer2 className="size-3.5" />
                    Move
                  </span>
                ),
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {boxes.length ? (
              <>
                <strong className="text-foreground">{plural(boxes.length, "box", "boxes")}</strong> on{" "}
                {plural(pages, "page")}.
              </>
            ) : (
              "None yet — drag over text or an image on the page."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedId && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  job.reset();
                  editor.remove(selectedId);
                  setSelectedId(null);
                }}
              >
                <Trash2 />
                Delete box
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!doc || countOnPage(editor.items, pageIndex) === 0}
              onClick={removeOnPage}
            >
              Clear this page
            </Button>
          </div>
        </div>
      </Panel>

      <ActionPanel
        label={boxes.length ? `Remove ${plural(boxes.length, "area")} for good` : "Redact PDF"}
        disabledReason={!doc || doc.status !== "ready" ? "Add a PDF first." : boxes.length === 0 ? "Draw a box over what to remove." : null}
        job={job.state}
        onRun={run}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        Text, images and line art under each box are deleted from the file, then the area is
        painted black — it can’t be copied or uncovered. Scanned pages are images, so the pixels
        under the box are blanked. Document properties and attachments aren’t changed.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!doc} />;
}
