import { useEffect, useRef, useState } from 'react';
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, Undo2 } from 'lucide-react';

import { ActionPanel, Message, Panel, ToolLayout } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { CanvasFrame } from '@/features/image/components/canvas-frame';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import {
  PREVIEW_MAX_SIDE,
  canvasToBlob,
  createCanvas,
  fitWithin,
  outputMime,
  paintBackground,
} from '@/features/image/lib/canvas';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  extensionFor,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import {
  IDENTITY,
  canvasTransform,
  flipHorizontal,
  flipVertical,
  isIdentity,
  orientedSize,
  rotateLeft,
  rotateRight,
  type Orientation,
} from '@/features/image/lib/orientation';
import { useDecodedImage } from '@/features/image/lib/use-decoded-image';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { getTool } from '@/lib/tools';

const tool = getTool('image-rotate');

/** Draws `image` with the orientation applied onto a canvas already sized for `scale`. */
function drawOriented(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  orientation: Orientation,
  scale: number,
) {
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.save();
  context.setTransform(...canvasTransform(width, height, orientation));
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
}

export function RotateTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>(IDENTITY);
  const job = useJob<void>('image_rotate');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const previewUrl = useObjectUrl(file);
  const { image, error, loading } = useDecodedImage(previewUrl);

  // Redraw the preview whenever the image or its orientation changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !image) return;
    const full = orientedSize(image.naturalWidth, image.naturalHeight, orientation);
    const { width, height, scale } = fitWithin(full.width, full.height, PREVIEW_MAX_SIDE);
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingQuality = 'high';
    drawOriented(context, image, orientation, scale);
  }, [image, orientation]);

  const change = (next: Orientation) => {
    job.reset();
    setOrientation(next);
  };

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (!accepted[0]) return;
    job.reset();
    setOrientation(IDENTITY);
    setFile(accepted[0]);
  };

  const clear = () => {
    job.reset();
    setFile(null);
    setNotice(null);
    setOrientation(IDENTITY);
  };

  const save = () => {
    if (!file || !image) return;
    void job.run(async () => {
      const mime = outputMime(file.type);
      const size = orientedSize(image.naturalWidth, image.naturalHeight, orientation);
      const { canvas, context } = createCanvas(size.width, size.height);
      paintBackground(context, mime);
      drawOriented(context, image, orientation, 1);
      const blob = await canvasToBlob(canvas, mime);
      downloadBlob(blob, `${stem(file.name)}-rotated.${extensionFor(mime)}`);
    });
  };

  const dimensions = image
    ? orientedSize(image.naturalWidth, image.naturalHeight, orientation)
    : null;

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      dimensions={dimensions}
      accept={BROWSER_IMAGE_TYPES}
      hint={BROWSER_IMAGE_HINT}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {error && <Message tone="error">{error}</Message>}
      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Opening image…</p>}
      {image && <CanvasFrame ref={canvasRef} label="Preview of the rotated image" />}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel
        title="Rotate & flip"
        action={
          <Button
            variant="ghost"
            size="xs"
            disabled={isIdentity(orientation)}
            onClick={() => change(IDENTITY)}
          >
            <Undo2 />
            Reset
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={!image} onClick={() => change(rotateLeft(orientation))}>
            <RotateCcw />
            Rotate left
          </Button>
          <Button variant="outline" disabled={!image} onClick={() => change(rotateRight(orientation))}>
            <RotateCw />
            Rotate right
          </Button>
          <Button
            variant="outline"
            disabled={!image}
            onClick={() => change(flipHorizontal(orientation))}
          >
            <FlipHorizontal2 />
            Flip horizontal
          </Button>
          <Button
            variant="outline"
            disabled={!image}
            onClick={() => change(flipVertical(orientation))}
          >
            <FlipVertical2 />
            Flip vertical
          </Button>
        </div>
      </Panel>
      <ActionPanel
        label="Download image"
        disabledReason={!image ? 'Add an image first.' : isIdentity(orientation) ? 'Rotate or flip the image first.' : null}
        job={job.state}
        onRun={save}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        Saved at full resolution in the original format (GIF and AVIF become PNG). Camera metadata
        such as location isn’t kept.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
