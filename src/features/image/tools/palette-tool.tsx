import { useEffect, useState } from 'react';
import ColorThief from 'colorthief';
import { Check, Copy } from 'lucide-react';

import { Field, Message, Panel, Segmented, ToolLayout } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { ImagePreview, SingleImageWorkspace } from '@/features/image/components/image-workspace';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  loadImage,
  partitionImages,
  useObjectUrl,
} from '@/features/image/lib/files';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-palette');

type Rgb = [number, number, number];
type Notation = 'hex' | 'rgb' | 'hsl';

const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;

function toHsl([r, g, b]: Rgb) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  h = Math.round(h * 60 + 360) % 360;
  return `hsl(${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

function format(color: Rgb, notation: Notation) {
  if (notation === 'hex') return toHex(color);
  if (notation === 'rgb') return `rgb(${color.join(' ')})`;
  return toHsl(color);
}

/** Relative luminance → whether light text reads better on this color. */
function isDark([r, g, b]: Rgb) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

export function PaletteTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [count, setCount] = useState('6');
  const [notation, setNotation] = useState<Notation>('hex');
  const [colors, setColors] = useState<Rgb[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const previewUrl = useObjectUrl(file);

  useEffect(() => {
    if (!previewUrl) return;
    let cancelled = false;
    loadImage(previewUrl)
      .then((img) => {
        if (cancelled) return;
        const palette = new ColorThief().getPalette(img, Number(count)) as Rgb[] | null;
        setColors(palette ?? []);
        setError(palette ? null : 'Couldn’t find distinct colors in this image.');
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : 'Couldn’t read this image.');
      });
    return () => {
      cancelled = true;
    };
  }, [previewUrl, count]);

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'browser');
    setNotice(problem);
    if (accepted[0]) setFile(accepted[0]);
  };

  const clear = () => {
    setFile(null);
    setColors([]);
    setError(null);
    setNotice(null);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      setError('Clipboard access was blocked — select the value and copy it manually.');
    }
  };

  const cssVariables = colors
    .map((color, index) => `  --palette-${index + 1}: ${format(color, notation)};`)
    .join('\n');

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      accept={BROWSER_IMAGE_TYPES}
      hint={BROWSER_IMAGE_HINT}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {error && <Message tone="error">{error}</Message>}
      {previewUrl && (
        <div className="space-y-4">
          {colors.length > 0 && (
            <div className="flex h-28 overflow-hidden rounded-xl border border-border shadow-sm sm:h-36">
              {colors.map((color, index) => {
                const value = format(color, notation);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => void copy(value, `swatch-${index}`)}
                    className={cn(
                      'group relative flex flex-1 items-end p-2 text-left transition-[flex-grow] duration-300 hover:flex-[1.6]',
                      isDark(color) ? 'text-white' : 'text-neutral-900',
                    )}
                    style={{ backgroundColor: toHex(color) }}
                    aria-label={`Copy ${value}`}
                  >
                    <span className="font-mono text-[10px] tracking-wide uppercase opacity-0 transition-opacity group-hover:opacity-100 sm:text-[11px] [@media(hover:none)]:opacity-100">
                      {copied === `swatch-${index}` ? 'Copied' : toHex(color)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <ImagePreview src={previewUrl} alt={file!.name} />
        </div>
      )}
    </SingleImageWorkspace>
  );

  const sidebar = (
    <>
      <Panel title="Palette">
        <div className="space-y-5">
          <Field label="Colors">
            <Segmented
              label="Number of colors"
              value={count}
              onChange={setCount}
              options={['4', '6', '8', '10'].map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Notation">
            <Segmented
              label="Color notation"
              value={notation}
              onChange={setNotation}
              options={[
                { value: 'hex', label: 'HEX' },
                { value: 'rgb', label: 'RGB' },
                { value: 'hsl', label: 'HSL' },
              ]}
            />
          </Field>
          {colors.length > 0 && (
            <ul className="space-y-1.5">
              {colors.map((color, index) => {
                const value = format(color, notation);
                const key = `row-${index}`;
                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => void copy(value, key)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border px-2 py-1.5 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className="size-7 shrink-0 rounded-md border border-black/10"
                        style={{ backgroundColor: toHex(color) }}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">{value}</span>
                      {copied === key ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>
      {colors.length > 0 && (
        <Panel title="CSS variables">
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-5">
            {`:root {\n${cssVariables}\n}`}
          </pre>
          <Button
            variant="outline"
            block
            className="mt-3"
            onClick={() => void copy(`:root {\n${cssVariables}\n}`, 'css')}
          >
            {copied === 'css' ? <Check /> : <Copy />}
            {copied === 'css' ? 'Copied' : 'Copy CSS'}
          </Button>
        </Panel>
      )}
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
