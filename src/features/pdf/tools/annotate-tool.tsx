import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Circle,
  Highlighter,
  Minus,
  Hash,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";

import { ToolPalette, type PaletteTool } from "@/components/markup/tool-palette";
import { ColorSwatches, HIGHLIGHT_COLORS, INK_COLORS } from "@/components/tool/color-swatches";
import {
  ActionPanel,
  Checkbox,
  FileRow,
  Message,
  Panel,
  ResultPanel,
  Slider,
  ToolLayout,
  outputDetail,
} from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { PdfOutputPreview } from "@/features/pdf/components/output-preview";
import { PageEditor, type ToolStyle } from "@/features/pdf/components/page-editor";
import { SingleDocumentWorkspace } from "@/features/pdf/components/single-document";
import { useEditorItems } from "@/features/pdf/hooks/use-editor-items";
import { usePdfDocuments } from "@/features/pdf/hooks/use-pdf-documents";
import { toOverlays, type EditorTool } from "@/features/pdf/lib/editor-items";
import { addOverlaysToFile } from "@/features/pdf/lib/engine";
import { hasUnsupportedCharacters } from "@/features/pdf/lib/overlay";
import { useJob } from "@/hooks/use-job";
import { downloadFile, type OutputFile } from "@/lib/download";
import { baseName, plural } from "@/lib/format";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-annotate");

const TOOLS: PaletteTool[] = [
  { value: "select", label: "Move", icon: MousePointer2, hint: "Select, move and resize what you’ve added." },
  { value: "text", label: "Text", icon: Type, hint: "Click where the text should start, then type." },
  { value: "check", label: "Check", icon: Check, hint: "Click a box to tick it." },
  { value: "cross", label: "Cross", icon: X, hint: "Click to place an X." },
  { value: "highlight", label: "Highlight", icon: Highlighter, hint: "Drag over the text to highlight." },
  { value: "rect", label: "Rectangle", icon: Square, hint: "Drag to draw a rectangle." },
  { value: "ellipse", label: "Ellipse", icon: Circle, hint: "Drag to draw an ellipse." },
  { value: "pen", label: "Draw", icon: Pencil, hint: "Draw freehand. Hold the mouse or your finger down." },
  { value: "step", label: "Step", icon: Hash, hint: "Click to drop a numbered marker: 1, 2, 3…" },
  { value: "line", label: "Line", icon: Minus, hint: "Drag to draw a line." },
  { value: "arrow", label: "Arrow", icon: ArrowUpRight, hint: "Drag from the tail to the tip." },
];

const DEFAULT_STYLE = {
  ink: "#111111",
  highlight: "#ffe600",
  fill: false,
  strokeWidth: 2,
  fontSize: 14,
  markSize: 18,
};

export function AnnotateTool() {
  const documents = usePdfDocuments({ multiple: false });
  const editor = useEditorItems();
  const job = useJob<OutputFile & { pageCount: number }>();
  const [current, setCurrent] = useState<EditorTool>("text");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [style, setStyle] = useState(DEFAULT_STYLE);

  const doc = documents.documents[0];
  const selected = editor.items.find((item) => item.id === selectedId) ?? null;

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

  // Which colour the swatches edit: the selected mark's own kind, else the active tool's.
  const kind = selected?.kind ?? current;
  const highlighting = kind === "highlight";
  const colour = highlighting ? style.highlight : style.ink;
  const showsText = kind === "text";
  const showsStroke = ["rect", "ellipse", "line", "arrow", "pen"].includes(kind);
  const showsFill = kind === "rect" || kind === "ellipse";
  const showsMark = kind === "check" || kind === "cross" || kind === "mark" || kind === "step";

  const change = (patch: Partial<typeof DEFAULT_STYLE>, itemPatch?: Record<string, unknown>) => {
    job.reset();
    setStyle((existing) => ({ ...existing, ...patch }));
    if (selected && itemPatch) editor.patch(selected.id, itemPatch as never);
  };

  const toolStyle: ToolStyle = {
    color: current === "highlight" ? style.highlight : style.ink,
    fill: style.fill ? style.ink : null,
    strokeWidth: style.strokeWidth,
    fontSize: style.fontSize,
    markSize: style.markSize,
  };

  const items = editor.items;
  const overlays = toOverlays(items);
  const unsupported = overlays.some((item) => item.kind === "text" && hasUnsupportedCharacters(item.text));
  const disabledReason = !doc || doc.status !== "ready" ? "Add a PDF first." : overlays.length === 0 ? "Add some text or marks first." : null;

  const run = () => {
    if (!doc) return;
    void job.run(async () => ({
      name: `${baseName(doc.file.name)}-annotated.pdf`,
      bytes: await addOverlaysToFile({ file: doc.file, password: doc.password }, overlays),
      pageCount: doc.pageCount ?? 0,
    }));
  };

  const main = (
    <SingleDocumentWorkspace documents={documentsApi} tool={tool}>
      {(ready) => (
        <PageEditor
          docId={ready.id}
          pageCount={ready.pageCount}
          pageIndex={Math.min(page, ready.pageCount - 1)}
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
          style={toolStyle}
          selectedId={selectedId}
          onSelect={setSelectedId}
          editingId={editingId}
          onEditing={setEditingId}
          onToolChange={setCurrent}
          ariaLabel="PDF page. Choose a tool, then click or drag on the page."
        />
      )}
    </SingleDocumentWorkspace>
  );

  const result = job.state.status === "done" ? job.state.result : null;

  const sidebar = result ? (
    <ResultPanel
      title="Your PDF is ready"
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
      <Panel
        title="Tools"
        action={
          <Button variant="ghost" size="xs" disabled={!editor.canUndo} onClick={() => { job.reset(); editor.undo(); }}>
            <Undo2 />
            Undo
          </Button>
        }
      >
        <ToolPalette tools={TOOLS} value={current} onChange={setCurrent} disabled={!doc} />
      </Panel>

      <Panel title={selected ? "Selected mark" : "Style"}>
        <div className="space-y-4">
          <ColorSwatches
            label="Colour"
            value={colour}
            colors={highlighting ? HIGHLIGHT_COLORS : INK_COLORS}
            onChange={(next) =>
              change(
                highlighting ? { highlight: next } : { ink: next },
                {
                  color: next,
                  ...((selected?.kind === "rect" || selected?.kind === "ellipse") && selected.fill
                    ? { fill: next }
                    : {}),
                }
              )
            }
          />
          {showsText && (
            <Slider
              label="Text size"
              value={selected?.kind === "text" ? selected.size : style.fontSize}
              min={6}
              max={48}
              format={(value) => `${value} pt`}
              onChange={(next) => change({ fontSize: next }, { size: next })}
            />
          )}
          {showsStroke && (
            <Slider
              label="Line thickness"
              value={style.strokeWidth}
              min={1}
              max={12}
              format={(value) => `${value} pt`}
              onChange={(next) => change({ strokeWidth: next }, { strokeWidth: next })}
            />
          )}
          {showsFill && (
            <Checkbox
              checked={selected && (selected.kind === "rect" || selected.kind === "ellipse") ? !!selected.fill : style.fill}
              label="Fill the shape"
              description="Pick white to cover something up. To remove text for good, use Redact PDF."
              onChange={(next) => change({ fill: next }, { fill: next ? (selected?.kind === "rect" || selected?.kind === "ellipse" ? selected.color : style.ink) : null })}
            />
          )}
          {showsMark && (
            <Slider
              label="Size"
              value={style.markSize}
              min={8}
              max={60}
              format={(value) => `${value} pt`}
              onChange={(next) => change({ markSize: next }, { w: next, h: next })}
            />
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
              Delete this mark
            </Button>
          )}
        </div>
      </Panel>

      {unsupported && (
        <Message tone="info">
          Some characters can’t be drawn in the PDF’s built-in font and will appear as “?”. Latin
          letters, numbers and common punctuation work.
        </Message>
      )}

      <ActionPanel
        label={overlays.length ? `Save PDF with ${plural(overlays.length, "mark")}` : "Save PDF"}
        disabledReason={disabledReason}
        job={job.state}
        onRun={run}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        Marks are added to the page itself. Existing form fields aren’t filled — type over them
        instead.
      </p>
    </>
  );

  return <ToolLayout main={result ? <PdfOutputPreview files={[result]} onEdit={job.reset} /> : main} sidebar={sidebar} active={!!doc} />;
}
