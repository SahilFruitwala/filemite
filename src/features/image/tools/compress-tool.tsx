import { useCallback, useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { ChevronDown, Download, ImageUp, Loader2, RotateCcw, Trash2, X } from 'lucide-react';

import { AddFilesButton, DropTarget, FileDrop } from '@/components/tool/file-drop';
import { Field, Message, Munching, Panel, Segmented, ToolLayout } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import ImageCompare from '@/features/image/components/ImageCompare';
import { isQuotaError, postImageForm, runQueue } from '@/features/image/lib/api';
import {
  ACCEPTED_IMAGE_TYPES,
  SERVER_IMAGE_HINT,
  extensionFor,
  partitionImages,
  stem,
} from '@/features/image/lib/files';
import { downloadBlob, downloadBlobsAsZip } from '@/lib/download';
import { formatBytes, plural } from '@/lib/format';
import {
  IMAGE_UPLOAD_CONCURRENCY,
  IMAGES_PER_HOUR,
  MAX_IMAGE_BATCH,
  MAX_IMAGE_BYTES,
} from '@/lib/limits';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';

const tool = getTool('image-compress');

type Level = 'best' | 'mid' | 'low';
type OutputFormat = 'original' | 'webp' | 'jpeg' | 'png';

const LEVELS: { value: Level; label: string }[] = [
  { value: 'best', label: 'Best' },
  { value: 'mid', label: 'Balanced' },
  { value: 'low', label: 'Smallest' },
];

const LEVEL_HINT: Record<Level, string> = {
  best: 'Visually identical. Good for photography and print.',
  mid: 'The sweet spot for websites and sharing.',
  low: 'Maximum savings. Fine detail may soften.',
};

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'original', label: 'Keep' },
  { value: 'webp', label: 'WebP' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

const FORMAT_HINT: Record<OutputFormat, string> = {
  original: 'Same type as the original (HEIC becomes JPEG).',
  webp: 'Smallest files, keeps transparency. Supported everywhere modern.',
  jpeg: 'Best for photos. No transparency.',
  png: 'Lossless edges for graphics and screenshots.',
};

type Item = {
  id: string;
  file: File;
  originalUrl: string;
  status: 'queued' | 'working' | 'done' | 'error';
  result?: { blob: Blob; url: string; ms: number };
  error?: string;
};

function outputName(item: Item) {
  const mime = item.result?.blob.type ?? item.file.type;
  return `${stem(item.file.name)}-min.${extensionFor(mime)}`;
}

export function CompressTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [level, setLevel] = useState<Level>('mid');
  const [format, setFormat] = useState<OutputFormat>('original');
  const [notice, setNotice] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  // Settings used for the current results, to offer a re-run when they change.
  const [appliedSettings, setAppliedSettings] = useState({ level, format });

  // Revoke every object URL when leaving the page.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  useEffect(
    () => () =>
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.originalUrl);
        if (item.result) URL.revokeObjectURL(item.result.url);
      }),
    [],
  );

  const patch = useCallback((id: string, update: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }, []);

  const process = useCallback(
    async (batch: Item[], settings: { level: Level; format: OutputFormat }) => {
      setAppliedSettings(settings);
      posthog.capture('image_compression_started', {
        file_count: batch.length,
        compression_level: settings.level,
        output_format: settings.format,
      });

      let quotaMessage: string | null = null;
      const skipped = await runQueue(batch, async (item, _index, stop) => {
        patch(item.id, { status: 'working', error: undefined });
        const started = performance.now();
        try {
          const blob = await postImageForm(
            '/api/image/compress',
            () => {
              const form = new FormData();
              form.append('file', item.file);
              form.append('level', settings.level);
              if (settings.format !== 'original') form.append('format', settings.format);
              return form;
            },
            'Compression failed',
          );
          const ms = performance.now() - started;
          setItems((current) =>
            current.map((entry) => {
              if (entry.id !== item.id) return entry;
              if (entry.result) URL.revokeObjectURL(entry.result.url);
              return {
                ...entry,
                status: 'done',
                result: { blob, url: URL.createObjectURL(blob), ms },
              };
            }),
          );
          posthog.capture('image_compression_completed', {
            compression_level: settings.level,
            output_format: settings.format,
            original_size_bytes: item.file.size,
            compressed_size_bytes: blob.size,
            reduction_percent: Math.round((1 - blob.size / item.file.size) * 100),
            time_ms: Math.round(ms),
          });
        } catch (error) {
          posthog.capture('image_compression_failed', { compression_level: settings.level });
          // Out of quota: the rest of the batch would fail the same way, so don't send it.
          if (isQuotaError(error)) {
            quotaMessage = error.message;
            stop();
          }
          patch(item.id, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Compression failed',
          });
        }
      });

      if (quotaMessage && skipped.length) {
        const ids = new Set(skipped.map((index) => batch[index].id));
        const message = quotaMessage;
        setItems((current) =>
          current.map((entry) =>
            ids.has(entry.id) ? { ...entry, status: 'error', error: message } : entry,
          ),
        );
        setNotice(message);
      }
    },
    [patch],
  );

  const add = (files: File[]) => {
    const { accepted, notice: problems } = partitionImages(files, 'server');
    const slots = MAX_IMAGE_BATCH - items.length;
    const taken = accepted.slice(0, Math.max(0, slots));
    const overflow = accepted.length - taken.length;
    setNotice(
      [
        problems,
        overflow > 0
          ? `Up to ${MAX_IMAGE_BATCH} images per batch — ${plural(overflow, 'file')} skipped.`
          : null,
      ]
        .filter(Boolean)
        .join(' ') || null,
    );
    if (!taken.length) return;

    const fresh: Item[] = taken.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'queued',
    }));
    setItems((current) => [...current, ...fresh]);
    void process(fresh, { level, format });
  };

  const remove = (id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.result) URL.revokeObjectURL(target.result.url);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const clear = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.originalUrl);
      if (item.result) URL.revokeObjectURL(item.result.url);
    });
    setItems([]);
    setNotice(null);
  };

  const busy = items.some((item) => item.status === 'queued' || item.status === 'working');
  const done = items.filter((item) => item.status === 'done' && item.result);
  const failed = items.filter((item) => item.status === 'error');
  const before = done.reduce((sum, item) => sum + item.file.size, 0);
  const after = done.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0);
  const settingsChanged =
    items.length > 0 && (appliedSettings.level !== level || appliedSettings.format !== format);

  const rerunAll = () => {
    const batch = items.map((item) => ({ ...item, status: 'queued' as const }));
    setItems(batch);
    void process(batch, { level, format });
  };

  const downloadAll = async () => {
    setZipping(true);
    posthog.capture('zip_download_clicked', { file_count: done.length });
    try {
      await downloadBlobsAsZip(
        done.map((item) => ({ name: outputName(item), blob: item.result!.blob })),
        'compressed-images.zip',
      );
    } finally {
      setZipping(false);
    }
  };

  const main =
    items.length === 0 ? (
      <div className="space-y-3">
        <FileDrop
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          onFiles={add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose images"
          hint={`Up to ${MAX_IMAGE_BATCH} images · ${SERVER_IMAGE_HINT} each`}
          icon={ImageUp}
        />
        {notice && <Message tone="error">{notice}</Message>}
      </div>
    ) : (
      <DropTarget onFiles={add} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium">
            {plural(items.length, 'image')}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {items.length}/{MAX_IMAGE_BATCH}
            </span>
          </p>
          <Button variant="ghost" onClick={clear}>
            <Trash2 />
            Clear
          </Button>
          {items.length < MAX_IMAGE_BATCH && (
            <AddFilesButton
              accept={ACCEPTED_IMAGE_TYPES}
              multiple
              onFiles={add}
              label="Add images"
            />
          )}
        </div>
        {notice && (
          <Message tone="error" onDismiss={() => setNotice(null)}>
            {notice}
          </Message>
        )}
        <ul className="space-y-2.5">
          {items.map((item) => (
            <ResultRow
              key={item.id}
              item={item}
              onRemove={() => remove(item.id)}
              onRetry={() => void process([item], { level, format })}
            />
          ))}
        </ul>
      </DropTarget>
    );

  const sidebar = (
    <>
      <Panel title="Settings">
        <div className="space-y-5">
          <Field label="Quality" hint={LEVEL_HINT[level]}>
            <Segmented label="Quality" value={level} onChange={setLevel} options={LEVELS} />
          </Field>
          <Field label="Output format" hint={FORMAT_HINT[format]}>
            <Segmented
              label="Output format"
              value={format}
              onChange={setFormat}
              options={FORMATS}
            />
          </Field>
          {settingsChanged && (
            <Button variant="soft" block disabled={busy} onClick={rerunAll}>
              <RotateCcw />
              Apply to all {items.length} images
            </Button>
          )}
        </div>
      </Panel>

      {items.length > 0 && (
        <Panel title="Summary">
          {done.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-4xl font-semibold tracking-tight text-primary tabular">
                    {before > 0 ? Math.max(0, Math.round((1 - after / before) * 100)) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">smaller overall</p>
                </div>
                <p className="text-right font-mono text-xs text-muted-foreground tabular">
                  {formatBytes(before)}
                  <br />→ <span className="text-foreground">{formatBytes(after)}</span>
                </p>
              </div>
              {done.length > 1 ? (
                <Button size="xl" block disabled={zipping} onClick={() => void downloadAll()}>
                  {zipping ? <Loader2 className="animate-spin" /> : <Download />}
                  Download all ({done.length}) as ZIP
                </Button>
              ) : (
                <Button
                  size="xl"
                  block
                  onClick={() => downloadBlob(done[0].result!.blob, outputName(done[0]))}
                >
                  <Download />
                  Download
                </Button>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {busy ? <Munching /> : 'Nothing finished yet.'}
            </div>
          )}
          {failed.length > 0 && (
            <p className="mt-3 text-xs text-danger">
              {plural(failed.length, 'image')} failed — see the list.
            </p>
          )}
        </Panel>
      )}

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {`Fair use: up to ${MAX_IMAGE_BATCH} images per batch (${formatBytes(MAX_IMAGE_BYTES)} each), `}
        {`${IMAGE_UPLOAD_CONCURRENCY} processed at a time, ${IMAGES_PER_HOUR} per hour. `}
        Images are processed in memory and discarded as soon as the result is sent back.
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={items.length > 0} />;
}

function ResultRow({
  item,
  onRemove,
  onRetry,
}: {
  item: Item;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const result = item.result;
  const savings = result ? 1 - result.blob.size / item.file.size : 0;
  const grew = result && savings < 0;
  // Browsers can't display HEIC, so there's no original to compare against.
  const previewable = !/hei[cf]/i.test(`${item.file.type} ${item.file.name}`);

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center gap-3 p-2.5 sm:p-3">
        <div className="bg-checker size-12 shrink-0 overflow-hidden rounded-lg border border-border">
          <img src={result?.url ?? item.originalUrl} alt="" className="size-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.file.name}>
            {item.file.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground tabular">
            <span>{formatBytes(item.file.size)}</span>
            {result && (
              <>
                <span aria-hidden>→</span>
                <span className="text-foreground">{formatBytes(result.blob.size)}</span>
                <span className="uppercase">{extensionFor(result.blob.type)}</span>
              </>
            )}
            {item.status === 'queued' && <span>Waiting…</span>}
            {item.status === 'working' && <span>Compressing…</span>}
            {item.status === 'error' && <span className="text-danger">{item.error}</span>}
          </div>
        </div>

        {result && (
          <span
            className={cn(
              'hidden rounded-full px-2 py-0.5 font-mono text-xs font-medium tabular sm:inline',
              grew ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary',
            )}
          >
            {grew ? 'already optimal' : `−${Math.round(savings * 100)}%`}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          {(item.status === 'queued' || item.status === 'working') && (
            <Loader2 className="mx-2 size-4 animate-spin text-primary" aria-label="Working" />
          )}
          {item.status === 'error' && (
            <Button variant="ghost" size="icon-sm" aria-label="Retry" onClick={onRetry}>
              <RotateCcw />
            </Button>
          )}
          {result && (
            <>
              {previewable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={open ? 'Hide comparison' : 'Compare with original'}
                  aria-expanded={open}
                  onClick={() => setOpen((value) => !value)}
                >
                  <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${item.file.name}`}
                onClick={() => downloadBlob(result.blob, outputName(item))}
              >
                <Download />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${item.file.name}`}
            onClick={onRemove}
          >
            <X />
          </Button>
        </div>
      </div>

      {item.status === 'working' && (
        <div className="h-0.5 overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      )}

      {open && result && previewable && (
        <div className="border-t border-border p-3">
          <ImageCompare
            original={item.originalUrl}
            compressed={result.url}
            rightLabel={`Optimized · ${formatBytes(result.blob.size)}`}
          />
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
            Drag to compare · processed in {Math.round(result.ms)} ms
          </p>
        </div>
      )}
    </li>
  );
}
