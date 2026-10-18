import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { Camera, Clock, Loader2, MapPin, ShieldCheck, Tag, UserRound } from 'lucide-react';

import { Message, Panel, ResultPanel, ToolLayout } from '@/components/tool/tool-ui';
import { Button } from '@/components/ui/button';
import { ImagePreview, SingleImageWorkspace } from '@/features/image/components/image-workspace';
import { postImageForm } from '@/features/image/lib/api';
import {
  ACCEPTED_IMAGE_TYPES,
  SERVER_IMAGE_HINT,
  extensionFor,
  partitionImages,
  stem,
  useObjectUrl,
} from '@/features/image/lib/files';
import { useJob } from '@/hooks/use-job';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { getTool } from '@/lib/tools';

const tool = getTool('image-scrub');

type Finding = { icon: typeof MapPin; label: string; value: string };

/** Reads the privacy-relevant tags in the browser, so the user sees what's being removed. */
async function inspect(file: File): Promise<Finding[]> {
  const { default: exifr } = await import('exifr');
  const tags = (await exifr
    .parse(file, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: false })
    .catch(() => null)) as Record<string, unknown> | null;
  if (!tags) return [];

  const findings: Finding[] = [];
  const text = (value: unknown) => (value == null ? '' : String(value).trim());

  if (typeof tags.latitude === 'number' && typeof tags.longitude === 'number') {
    findings.push({
      icon: MapPin,
      label: 'GPS location',
      value: `${tags.latitude.toFixed(4)}, ${tags.longitude.toFixed(4)}`,
    });
  }
  const camera = [text(tags.Make), text(tags.Model)].filter(Boolean).join(' ');
  if (camera) findings.push({ icon: Camera, label: 'Camera', value: camera });
  const taken = tags.DateTimeOriginal ?? tags.CreateDate;
  if (taken) {
    findings.push({
      icon: Clock,
      label: 'Date taken',
      value: taken instanceof Date ? taken.toLocaleString() : text(taken),
    });
  }
  const owner =
    text(tags.Artist) || text(tags.Copyright) || text(tags.OwnerName) || text(tags.creator);
  if (owner) findings.push({ icon: UserRound, label: 'Owner', value: owner });
  const software = text(tags.Software);
  if (software) findings.push({ icon: Tag, label: 'Software', value: software });
  return findings;
}

export function ScrubTool() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspected, setInspected] = useState<{ file: File; findings: Finding[] } | null>(null);
  const job = useJob<Blob>();
  const previewUrl = useObjectUrl(file);
  const result = job.state.status === 'done' ? job.state.result : null;

  const scrub = (target: File) =>
    job.run(async () => {
      const blob = await postImageForm(
        '/api/image/scrub',
        () => {
          const form = new FormData();
          form.append('file', target);
          return form;
        },
        'Scrubbing failed',
      );
      posthog.capture('metadata_scrubbed', {
        file_format: target.type,
        original_size_bytes: target.size,
        scrubbed_size_bytes: blob.size,
      });
      return blob;
    });

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    void inspect(file).then((findings) => !cancelled && setInspected({ file, findings }));
    return () => {
      cancelled = true;
    };
  }, [file]);

  const add = (files: File[]) => {
    const { accepted, notice: problem } = partitionImages(files.slice(0, 1), 'server');
    setNotice(problem);
    if (!accepted[0]) return;
    setFile(accepted[0]);
    // Cleaning is the whole point — start right away.
    void scrub(accepted[0]);
  };

  const clear = () => {
    job.reset();
    setFile(null);
    setNotice(null);
  };

  const download = () =>
    result && file && downloadBlob(result, `${stem(file.name)}-clean.${extensionFor(result.type)}`);

  const findings = inspected?.file === file ? inspected.findings : null;
  const previewable = file && !/hei[cf]/i.test(`${file.type} ${file.name}`);

  const main = (
    <SingleImageWorkspace
      tool={tool}
      file={file}
      previewUrl={previewUrl}
      accept={ACCEPTED_IMAGE_TYPES}
      hint={SERVER_IMAGE_HINT}
      notice={notice}
      onFiles={add}
      onClear={clear}
    >
      {previewUrl && previewable && <ImagePreview src={previewUrl} alt={file!.name} />}
    </SingleImageWorkspace>
  );

  const findingsPanel = file && (
    <Panel title="Found in this file">
      {findings === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Reading metadata…
        </p>
      ) : findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No location, camera or author tags — we’ll still strip any hidden profiles and comments.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {findings.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex items-start gap-2.5 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span className="block truncate font-medium line-through decoration-danger/60">
                  {value}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  const sidebar = (
    <>
      {result ? (
        <ResultPanel
          title="Metadata removed"
          onDownload={download}
          downloadLabel="Download clean copy"
          onStartOver={clear}
          startOverLabel="Clean another photo"
        >
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            EXIF, GPS, XMP and IPTC data stripped. Orientation is baked into the pixels.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatBytes(file!.size)} → {formatBytes(result.size)}
          </p>
        </ResultPanel>
      ) : (
        file && (
          <Panel>
            {job.state.status === 'error' ? (
              <div className="space-y-3">
                <Message tone="error">{job.state.error}</Message>
                <Button block onClick={() => void scrub(file)}>
                  Try again
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin text-primary" />
                Stripping metadata…
              </p>
            )}
          </Panel>
        )
      )}
      {findingsPanel}
      {!file && (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          Photos carry hidden details — where they were taken, the device, sometimes your name. We
          re-encode the pixels without any of it.
        </p>
      )}
    </>
  );

  return <ToolLayout main={main} sidebar={sidebar} active={!!file} />;
}
