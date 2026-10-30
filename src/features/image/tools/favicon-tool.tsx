import { useEffect, useState } from 'react';
import { capture } from '@/lib/capture';
import { Check, Copy, Download } from 'lucide-react';

import { ActionPanel, Panel, ResultPanel, ToolLayout } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { SingleImageWorkspace } from '@/features/image/components/image-workspace';
import { postImageForm } from '@/features/image/lib/api';
import { faviconsInBrowser } from '@/features/image/lib/browser-image';
import { useImageSize, useObjectUrl } from '@/features/image/lib/files';
import {
  ProcessingModeField,
  acceptFor,
  hintFor,
  partitionForMode,
  useProcessingMode,
} from '@/features/image/lib/processing-mode';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { getTool } from '@/lib/tools';

const tool = getTool('image-favicon');

const HTML_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;

type Asset = { name: string; size: number; url: string; px: number | null };

/** Unpacks the icon ZIP so each icon can be previewed. */
async function unpack(zip: Blob): Promise<Asset[]> {
  const { unzipSync } = await import('fflate');
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  return Object.entries(entries)
    .map(([name, bytes]) => {
      const px = Number(name.match(/(\d+)x\1/)?.[1] ?? (name.startsWith('apple') ? 180 : NaN));
      const type = name.endsWith('.ico') ? 'image/x-icon' : 'image/png';
      return {
        name,
        size: bytes.length,
        url: URL.createObjectURL(new Blob([bytes as BlobPart], { type })),
        px: Number.isFinite(px) ? px : null,
      };
    })
    .sort((a, b) => (a.px ?? 999) - (b.px ?? 999));
}

export function FaviconTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useProcessingMode();
  const job = useJob<{ zip: Blob; assets: Asset[] }>();
  const previewUrl = useObjectUrl(file);
  const natural = useImageSize(previewUrl);
  const result = job.state.status === 'done' ? job.state.result : null;

  useEffect(
    () => () => result?.assets.forEach((asset) => URL.revokeObjectURL(asset.url)),
    [result],
  );

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionForMode(files.slice(0, 1), mode);
    setNotice(problem);
    if (!accepted[0]) return;
    job.reset();
    setFile(accepted[0]);
  };

  const clear = () => {
    job.reset();
    setFile(null);
    setNotice(null);
  };

  const run = () => {
    if (!file) return;
    void job.run(async () => {
      const zip =
        mode === 'browser'
          ? await faviconsInBrowser(file)
          : await postImageForm(
              '/api/image/favicon',
              () => {
                const form = new FormData();
                form.append('file', file);
                return form;
              },
              'Favicon generation failed',
            );
      capture('favicons_generated', { processing: mode, original_size_bytes: file.size });
      return { zip, assets: await unpack(zip) };
    });
  };

  const notSquare = natural && Math.abs(natural.width - natural.height) > 2;
  const icons = result?.assets.filter((asset) => asset.name.startsWith('favicon-')) ?? [];
  const special = result?.assets.filter((asset) => !asset.name.startsWith('favicon-')) ?? [];

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      dimensions={natural}
      accept={acceptFor(mode)}
      hint={hintFor(mode)}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {result ? (
        <div className="space-y-6">
          <section>
            <h2 className="eyebrow mb-3">Browser icons</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {icons.map((asset) => (
                <button
                  key={asset.name}
                  type="button"
                  onClick={() => downloadBlobFromUrl(asset)}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary-line"
                >
                  <span className="bg-checker flex size-16 items-center justify-center rounded-lg border border-border">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      style={{
                        width: Math.min(56, asset.px ?? 56),
                        height: Math.min(56, asset.px ?? 56),
                      }}
                      className="[image-rendering:pixelated]"
                    />
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                    {asset.px}px
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            {special.map((asset) => (
              <div
                key={asset.name}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <span className="bg-checker flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border">
                  <img src={asset.url} alt={asset.name} className="size-full object-contain" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {asset.name.endsWith('.ico') ? '16 · 32 · 48px' : '180px · iOS home screen'} ·{' '}
                    {formatBytes(asset.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Download ${asset.name}`}
                  onClick={() => downloadBlobFromUrl(asset)}
                >
                  <Download />
                </Button>
              </div>
            ))}
          </section>
        </div>
      ) : (
        previewUrl && (
          <div className="bg-checker flex aspect-[2/1] items-center justify-center gap-6 rounded-xl border border-border p-6">
            {[128, 64, 32, 16].map((px) => (
              <img
                key={px}
                src={previewUrl}
                alt=""
                style={{ width: px, height: px }}
                className="rounded-[18%] object-contain shadow-sm"
              />
            ))}
          </div>
        )
      )}
    </SingleImageWorkspace>
  );

  const sidebar = result ? (
    <>
      <ResultPanel
        title={`${result.assets.length} icons ready`}
        downloadLabel="Download all (.zip)"
        onDownload={() => downloadBlob(result.zip, 'favicons.zip')}
        onStartOver={clear}
      />
      <Panel title="Add to your <head>">
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-5">
          {HTML_SNIPPET}
        </pre>
        <Button
          variant="outline"
          block
          className="mt-3"
          onClick={() =>
            void navigator.clipboard.writeText(HTML_SNIPPET).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy HTML'}
        </Button>
      </Panel>
    </>
  ) : (
    <>
      <ActionPanel
        label="Generate favicons"
        disabledReason={file ? null : 'Add an image first.'}
        job={job.state}
        onRun={run}
      >
        <ul className="space-y-1.5 text-[13px] text-muted-foreground">
          <li>PNG icons at 16, 32, 48, 64, 128 and 256px</li>
          <li>favicon.ico with 16, 32 and 48px inside</li>
          <li>180px Apple touch icon on white</li>
        </ul>
      </ActionPanel>
      <Panel>
        <ProcessingModeField
          mode={mode}
          onChange={setMode}
          disabled={job.state.status === 'running'}
        />
      </Panel>
      {notSquare && (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          This image isn’t square, so it will be centered with transparent padding.
        </p>
      )}
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}

function downloadBlobFromUrl(asset: Asset) {
  const a = document.createElement('a');
  a.href = asset.url;
  a.download = asset.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
