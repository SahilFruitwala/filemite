import posthog from 'posthog-js';
import { useState } from 'react';
import { Download, FileImage, ImageUp, Loader2, Trash2, X } from 'lucide-react';

import { AddFilesButton, DropTarget, FileDrop } from '@/components/tool/file-drop';
import {
  ActionPanel,
  Field,
  Message,
  Panel,
  ResultPanel,
  Segmented,
  ToolLayout,
} from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { isQuotaError, postImageForm, runQueue } from '@/features/image/lib/api';
import { processInBrowser } from '@/features/image/lib/browser-image';
import { extensionFor, stem, useObjectUrl } from '@/features/image/lib/files';
import {
  ProcessingModeField,
  acceptFor,
  hintFor,
  partitionForMode,
  useProcessingMode,
} from '@/features/image/lib/processing-mode';
import { downloadBlob, downloadBlobsAsZip } from '@/lib/download';
import { formatBytes, plural } from '@/lib/format';
import { IMAGES_PER_HOUR, MAX_IMAGE_BATCH } from '@/lib/limits';
import { getTool } from '@/lib/tools';
import { cn } from '@/lib/utils';
import type { JobState } from '@/hooks/use-job';

const tool = getTool('image-convert');

type Format = 'jpeg' | 'png' | 'webp';
type Quality = 'best' | 'mid';

type Item = {
  id: string;
  file: File;
  status: 'queued' | 'working' | 'done' | 'error';
  result?: { blob: Blob; name: string };
  error?: string;
};

const FORMATS: { value: Format; label: string; hint: string }[] = [
  { value: 'jpeg', label: 'JPG', hint: 'Best for photos and the most widely supported. No transparency.' },
  { value: 'png', label: 'PNG', hint: 'Lossless and keeps transparency. Larger files.' },
  { value: 'webp', label: 'WebP', hint: 'Small files that keep transparency. Works on all modern browsers.' },
];

/** Shows the converted image once it exists, so the output can be checked before it's saved. */
function Thumb({ file, converted }: { file: File; converted?: Blob }) {
  const url = useObjectUrl(converted ?? file);
  const isHeic = !converted && /hei[cf]/i.test(`${file.type} ${file.name}`);
  return (
    <div className="bg-checker flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border">
      {url && !isHeic ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <FileImage className="size-5 text-muted-foreground" />
      )}
    </div>
  );
}

export function ConvertTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<Format>('jpeg');
  const [quality, setQuality] = useState<Quality>('best');
  const [mode, setMode] = useProcessingMode();
  const [notice, setNotice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  // What the finished results were converted to, so the labels stay right if the setting changes after.
  const [convertedTo, setConvertedTo] = useState<Format | null>(null);

  const patch = (id: string, update: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)));

  const add = (files: File[]) => {
    const { accepted, notice: problems } = partitionForMode(files, mode);
    const room = Math.max(0, MAX_IMAGE_BATCH - items.length);
    const taken = accepted.slice(0, room);
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
    setConvertedTo(null);
    setItems((current) => [
      // New files mean the earlier results are stale: queue everything again.
      ...current.map((item): Item => ({ ...item, status: 'queued', result: undefined, error: undefined })),
      ...taken.map((file): Item => ({ id: crypto.randomUUID(), file, status: 'queued' })),
    ]);
  };

  const convert = async () => {
    const target = format;
    const level = target === 'png' ? 'lossless' : quality;
    const batch = items;
    setRunning(true);
    setNotice(null);
    setConvertedTo(null);
    setItems((current) => current.map((item) => ({ ...item, status: 'queued', result: undefined, error: undefined })));

    posthog.capture('image_convert_started', { processing: mode, file_count: batch.length, output_format: target });
    let quotaMessage: string | null = null;
    const skipped = await runQueue(batch, async (item, _index, stop) => {
      patch(item.id, { status: 'working' });
      try {
        const blob =
          mode === 'browser'
            ? await processInBrowser(item.file, { format: target, level, keepSize: true })
            : await postImageForm(
                '/api/image/compress',
                () => {
                  const form = new FormData();
                  form.append('file', item.file);
                  form.append('format', target);
                  form.append('level', level);
                  form.append('keepSize', '1');
                  return form;
                },
                'Conversion failed',
              );
        patch(item.id, {
          status: 'done',
          result: { blob, name: `${stem(item.file.name)}.${extensionFor(blob.type || `image/${target}`)}` },
        });
        posthog.capture('image_convert_completed', {
          output_format: target,
          original_size_bytes: item.file.size,
          converted_size_bytes: blob.size,
        });
      } catch (error) {
        posthog.capture('image_convert_failed', { output_format: target });
        if (isQuotaError(error)) {
          quotaMessage = error.message;
          stop();
        }
        patch(item.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Conversion failed',
        });
      }
    });

    if (quotaMessage && skipped.length) {
      const ids = new Set(skipped.map((index) => batch[index].id));
      const message = quotaMessage;
      setItems((current) =>
        current.map((item) => (ids.has(item.id) ? { ...item, status: 'error', error: message } : item)),
      );
      setNotice(message);
    }
    setConvertedTo(target);
    setRunning(false);
  };

  const done = items.filter((item) => item.status === 'done' && item.result);
  const finished = convertedTo !== null && !running && done.length > 0;

  const downloadAll = async () => {
    if (done.length === 1) {
      downloadBlob(done[0].result!.blob, done[0].result!.name);
      return;
    }
    setZipping(true);
    try {
      await downloadBlobsAsZip(
        done.map((item) => ({ name: item.result!.name, blob: item.result!.blob })),
        'converted-images.zip',
      );
    } finally {
      setZipping(false);
    }
  };

  const job: JobState<void> = running
    ? {
        status: 'running',
        progress: items.length
          ? items.filter((item) => item.status === 'done' || item.status === 'error').length / items.length
          : null,
      }
    : { status: 'idle' };

  const main =
    items.length === 0 ? (
      <div className="space-y-3">
        <FileDrop
          accept={acceptFor(mode)}
          multiple
          onFiles={add}
          title={tool.emptyTitle}
          description={tool.emptyDescription}
          buttonLabel="Choose images"
          hint={hintFor(mode)}
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
          <Button
            variant="ghost"
            disabled={running}
            onClick={() => {
              setItems([]);
              setNotice(null);
              setConvertedTo(null);
            }}
          >
            <Trash2 />
            Clear
          </Button>
          {items.length < MAX_IMAGE_BATCH && (
            <AddFilesButton accept={acceptFor(mode)} multiple onFiles={add} label="Add images" />
          )}
        </div>
        {notice && <Message tone="error">{notice}</Message>}
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex animate-in fade-in items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm duration-300"
            >
              <Thumb file={item.file} converted={item.result?.blob} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={item.file.name}>
                  {item.result?.name ?? item.file.name}
                </p>
                <p
                  className={cn(
                    'font-mono text-[11px] tabular',
                    item.status === 'error' ? 'text-danger' : 'text-muted-foreground',
                  )}
                >
                  {item.status === 'error'
                    ? item.error
                    : item.status === 'done' && item.result
                      ? `${formatBytes(item.file.size)} → ${formatBytes(item.result.blob.size)}`
                      : item.status === 'working'
                        ? 'Converting…'
                        : formatBytes(item.file.size)}
                </p>
              </div>
              {item.status === 'working' && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {item.status === 'done' && item.result && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Download ${item.result.name}`}
                  onClick={() => downloadBlob(item.result!.blob, item.result!.name)}
                >
                  <Download />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.file.name}`}
                disabled={running}
                onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      </DropTarget>
    );

  const sidebar = finished ? (
    <ResultPanel
      title={done.length === items.length ? 'All converted' : `${done.length} of ${items.length} converted`}
      downloadLabel={done.length === 1 ? 'Download image' : zipping ? 'Zipping…' : 'Download all as ZIP'}
      onDownload={() => void downloadAll()}
      onStartOver={() => {
        setItems([]);
        setNotice(null);
        setConvertedTo(null);
      }}
    >
      {notice && <Message tone="error">{notice}</Message>}
      <p className="text-sm text-muted-foreground">
        Saved as <strong className="text-foreground">{FORMATS.find((f) => f.value === convertedTo)?.label}</strong> at
        full size. Camera metadata such as location isn’t kept.
      </p>
      <Button variant="outline" block onClick={() => setConvertedTo(null)}>
        Change format and convert again
      </Button>
    </ResultPanel>
  ) : (
    <>
      <Panel title="Convert to">
        <div className="space-y-4">
          <Segmented<Format>
            label="Output format"
            value={format}
            onChange={setFormat}
            options={FORMATS.map(({ value, label }) => ({ value, label }))}
          />
          <p className="text-xs leading-5 text-muted-foreground">{FORMATS.find((f) => f.value === format)?.hint}</p>
          {format !== 'png' && (
            <Field label="Quality">
              <Segmented<Quality>
                label="Quality"
                value={quality}
                onChange={setQuality}
                options={[
                  { value: 'best', label: 'Best', title: 'Visually identical to the original' },
                  { value: 'mid', label: 'Balanced', title: 'Smaller files' },
                ]}
              />
            </Field>
          )}
          <ProcessingModeField mode={mode} onChange={setMode} disabled={running} />
        </div>
      </Panel>
      <ActionPanel
        label={items.length ? `Convert ${plural(items.length, 'image')}` : 'Convert'}
        disabledReason={items.length ? null : 'Add one or more images.'}
        job={job}
        onRun={() => void convert()}
      />
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {mode === 'browser'
          ? 'Images are converted on your device and never uploaded.'
          : `Images are processed in memory and never stored. Up to ${IMAGES_PER_HOUR} images an hour.`}
      </p>
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={items.length > 0} />;
}
