import { useEffect, useRef, useState } from "react";
import { Eraser, ImageUp } from "lucide-react";

import { Segmented } from "@/components/tool/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SIGNATURE_FONTS,
  SIGNATURE_INKS,
  contentBounds,
  inkFromPaper,
} from "@/features/pdf/lib/signature";
import { cn } from "@/lib/utils";

export type Signature = { png: Uint8Array; url: string; aspect: number };

type Mode = "draw" | "type" | "upload";

const PAD_WIDTH = 720;
const PAD_HEIGHT = 240;
const PADDING = 12;

function hexToTriplet(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Crops a canvas to its inked area, with a little padding, and encodes it as a PNG. */
async function exportSignature(source: HTMLCanvasElement): Promise<Signature | null> {
  const context = source.getContext("2d");
  if (!context) return null;
  const bounds = contentBounds(
    context.getImageData(0, 0, source.width, source.height).data,
    source.width,
    source.height
  );
  if (!bounds) return null;
  const output = document.createElement("canvas");
  output.width = bounds.width + PADDING * 2;
  output.height = bounds.height + PADDING * 2;
  output
    .getContext("2d")!
    .drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, PADDING, PADDING, bounds.width, bounds.height);
  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return {
    png: new Uint8Array(await blob.arrayBuffer()),
    url: URL.createObjectURL(blob),
    aspect: output.width / output.height,
  };
}

/** Draw, type or upload a signature. Calls `onCreate` with a transparent PNG. */
export function SignatureMaker({ onCreate }: { onCreate: (signature: Signature) => void }) {
  const [mode, setMode] = useState<Mode>("draw");
  const [ink, setInk] = useState(SIGNATURE_INKS[0].value);
  const [hasInk, setHasInk] = useState(false);
  const [text, setText] = useState("");
  const [fontIndex, setFontIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pad = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const uploaded = useRef<HTMLCanvasElement | null>(null);
  const stroke = useRef<{ x: number; y: number } | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);

  const clearPad = () => {
    const canvas = pad.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const padPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * PAD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * PAD_HEIGHT,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = padPoint(event);
    stroke.current = point;
    const context = event.currentTarget.getContext("2d")!;
    context.fillStyle = ink;
    context.beginPath();
    context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    context.fill();
    setHasInk(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const from = stroke.current;
    if (!from) return;
    const to = padPoint(event);
    const context = event.currentTarget.getContext("2d")!;
    context.strokeStyle = ink;
    context.lineWidth = 4.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    // A quadratic through the midpoint keeps fast strokes smooth.
    context.quadraticCurveTo(from.x, from.y, (from.x + to.x) / 2, (from.y + to.y) / 2);
    context.stroke();
    stroke.current = to;
  };

  // The typed signature is drawn on its own canvas, after its font has loaded.
  useEffect(() => {
    if (mode !== "type") return;
    const canvas = preview.current;
    if (!canvas) return;
    let cancelled = false;
    const font = SIGNATURE_FONTS[fontIndex];
    const draw = async () => {
      await font.load();
      await document.fonts.load(`64px ${font.family}`);
      if (cancelled) return;
      const context = canvas.getContext("2d")!;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!text.trim()) return;
      let size = 120;
      context.font = `${size}px ${font.family}`;
      const available = canvas.width - 40;
      const measured = context.measureText(text).width;
      if (measured > available) {
        size = Math.floor((size * available) / measured);
        context.font = `${size}px ${font.family}`;
      }
      context.fillStyle = ink;
      context.textBaseline = "middle";
      context.textAlign = "center";
      context.fillText(text, canvas.width / 2, canvas.height / 2);
    };
    void draw();
    return () => {
      cancelled = true;
    };
  }, [mode, text, fontIndex, ink]);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!/^image\//.test(file.type)) {
      setError("Choose an image of your signature.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("This image couldn’t be read."));
        element.src = url;
      });
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      uploaded.current = canvas;
      setUploadName(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn’t read this image.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const ready =
    mode === "draw" ? hasInk : mode === "type" ? !!text.trim() : uploadName !== null;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      let source: HTMLCanvasElement | null = null;
      if (mode === "draw") source = pad.current;
      else if (mode === "type") source = preview.current;
      else if (uploaded.current) {
        // Work on a copy: the upload stays available if the person changes the ink and tries again.
        const copy = document.createElement("canvas");
        copy.width = uploaded.current.width;
        copy.height = uploaded.current.height;
        const context = copy.getContext("2d", { willReadFrequently: true })!;
        context.drawImage(uploaded.current, 0, 0);
        const pixels = context.getImageData(0, 0, copy.width, copy.height);
        inkFromPaper(pixels.data, hexToTriplet(ink));
        context.putImageData(pixels, 0, 0);
        source = copy;
      }
      const signature = source ? await exportSignature(source) : null;
      if (!signature) {
        setError("There’s nothing to use yet.");
        return;
      }
      onCreate(signature);
      if (mode === "draw") clearPad();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Segmented
        label="How to make your signature"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError(null);
        }}
        options={[
          { value: "draw", label: "Draw" },
          { value: "type", label: "Type" },
          { value: "upload", label: "Upload" },
        ]}
      />

      {mode === "draw" && (
        <div className="space-y-2">
          <canvas
            ref={pad}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            role="img"
            aria-label="Signature pad: draw your signature here with a mouse, finger or pen"
            className="bg-checker block h-auto w-full touch-none cursor-crosshair rounded-lg border border-border-strong"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (stroke.current = null)}
            onPointerCancel={() => (stroke.current = null)}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Sign above with your mouse or finger.</p>
            <Button variant="ghost" size="xs" disabled={!hasInk} onClick={clearPad}>
              <Eraser />
              Clear
            </Button>
          </div>
        </div>
      )}

      {mode === "type" && (
        <div className="space-y-3">
          <Input
            value={text}
            maxLength={40}
            placeholder="Type your name"
            aria-label="Your name"
            onChange={(event) => setText(event.target.value)}
          />
          <canvas
            ref={preview}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            role="img"
            aria-label="Preview of your typed signature"
            className="bg-checker block h-auto w-full rounded-lg border border-border-strong"
          />
          <div role="radiogroup" aria-label="Handwriting style" className="flex flex-wrap gap-1.5">
            {SIGNATURE_FONTS.map((font, index) => (
              <button
                key={font.label}
                type="button"
                role="radio"
                aria-checked={fontIndex === index}
                onClick={() => setFontIndex(index)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  fontIndex === index
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "upload" && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-card px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-within:ring-3 focus-within:ring-ring/40">
          <ImageUp className="size-5" />
          <span>
            {uploadName ? (
              <>
                <strong className="text-foreground">{uploadName}</strong> — choose another
              </>
            ) : (
              "Choose a photo or scan of your signature on white paper"
            )}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              void onUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      )}

      <div className="flex items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Ink colour" className="flex gap-1.5">
          {SIGNATURE_INKS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={ink === option.value}
              aria-label={option.label}
              title={option.label}
              onClick={() => setInk(option.value)}
              className={cn(
                "size-6 rounded-full border border-border-strong outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                ink === option.value && "ring-2 ring-primary ring-offset-2 ring-offset-card"
              )}
              style={{ backgroundColor: option.value }}
            />
          ))}
        </div>
        <Button disabled={!ready || busy} onClick={() => void create()}>
          Use signature
        </Button>
      </div>
      {mode === "draw" && hasInk && (
        <p className="text-xs text-muted-foreground">
          The ink colour applies to the next stroke. Clear the pad to change it.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
