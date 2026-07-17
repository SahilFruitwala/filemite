import posthog from 'posthog-js';
import React, { startTransition, useState } from 'react';
import JSZip from 'jszip';

import Dropzone from '@/components/Dropzone';
import ResultCard from '@/components/ResultCard';
import { CompressedFile, CompressionLevel } from '@/types';
import {
  MAX_SERVER_IMAGES,
  MAX_FILE_BYTES,
  LIMIT_REASONS,
  formatBytes,
} from '@/lib/constants';

import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

const CONCURRENCY = 3;

async function compressOne(
  file: File,
  level: CompressionLevel,
  outputFormat: 'original' | 'webp' | 'jpeg',
): Promise<{ blob: Blob; time: number }> {
  const start = performance.now();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('level', level);
  if (outputFormat !== 'original') {
    formData.append('format', outputFormat);
  }

  const response = await fetch('/api/compress', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = 'Compression failed';
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  return { blob, time: performance.now() - start };
}

export default function HomeClient() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [activeJobs, setActiveJobs] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');
  const [errorVisible, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'original' | 'webp' | 'jpeg'>('original');

  const isProcessing = activeJobs > 0;

  const downloadAllAsZip = async () => {
    const doneFiles = files.filter((f) => f.status === 'done' && f.blobUrl);
    if (doneFiles.length === 0) return;

    posthog.capture('zip_download_clicked', {
      file_count: doneFiles.length,
    });

    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const file of doneFiles) {
        const url = file.blobUrl;
        if (url) {
          const response = await fetch(url);
          const blob = await response.blob();
          const extension = file.outputFormat || file.fileRaw?.name.split('.').pop() || 'webp';
          zip.file(
            `optimized-${file.originalName.replace(/\.[^/.]+$/, '')}.${extension}`,
            blob,
          );
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `micropng-compressed.zip`;
      link.click();
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      posthog.captureException(error);
    } finally {
      setIsZipping(false);
    }
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
    const oversized = selectedFiles.filter((f) => f.size > MAX_FILE_BYTES);
    let queue = selectedFiles.filter((f) => f.size <= MAX_FILE_BYTES);

    if (oversized.length > 0) {
      setError(
        `${oversized.length} file${oversized.length > 1 ? 's' : ''} skipped — max ${formatBytes(MAX_FILE_BYTES)} each.`,
      );
    }

    if (queue.length === 0) return;

    const remainingSlots = Math.max(0, MAX_SERVER_IMAGES - files.length);
    if (remainingSlots === 0) {
      setError(`Limit reached: ${MAX_SERVER_IMAGES} images max. Remove some to add more.`);
      return;
    }
    if (queue.length > remainingSlots) {
      setError(`Only ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} can be added.`);
      queue = queue.slice(0, remainingSlots);
    }

    const newFiles: CompressedFile[] = queue.map((file) => ({
      id: crypto.randomUUID(),
      originalName: file.name,
      originalSize: file.size,
      originalBlobUrl: URL.createObjectURL(file),
      compressedSize: 0,
      blobUrl: '',
      status: 'pending',
      clientStatus: 'pending',
      serverStatus: 'pending',
      fileRaw: file,
    }));

    startTransition(() => {
      setFiles((prev) => [...prev, ...newFiles]);
    });

    posthog.capture('image_compression_started', {
      file_count: queue.length,
      processing_mode: 'server',
      compression_level: compressionLevel,
      output_format: outputFormat,
    });

    setActiveJobs((n) => n + 1);
    try {
      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, newFiles.length) }, async () => {
        while (cursor < newFiles.length) {
          const index = cursor++;
          const entry = newFiles[index];
          const file = queue[index];

          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'processing', serverStatus: 'processing' }
                : f,
            ),
          );

          try {
            const result = await compressOne(file, compressionLevel, outputFormat);

            setFiles((prev) =>
              prev.map((f) => {
                if (f.id !== entry.id) return f;
                const blobUrl = URL.createObjectURL(result.blob);
                return {
                  ...f,
                  status: 'done' as const,
                  serverStatus: 'done' as const,
                  compressedSize: result.blob.size,
                  blobUrl,
                  outputFormat: result.blob.type.split('/')[1] || 'webp',
                  serverStats: {
                    size: result.blob.size,
                    time: result.time,
                    blobUrl,
                  },
                };
              }),
            );

            posthog.capture('image_compression_completed', {
              processing_mode: 'server',
              compression_level: compressionLevel,
              original_size_bytes: file.size,
              compressed_size_bytes: result.blob.size,
              reduction_percent: Math.round(
                ((file.size - result.blob.size) / file.size) * 100,
              ),
              time_ms: Math.round(result.time),
              output_format: outputFormat,
            });
          } catch (error) {
            console.error(error);
            posthog.captureException(error);
            posthog.capture('image_compression_failed', {
              processing_mode: 'server',
              compression_level: compressionLevel,
            });
            const message = error instanceof Error ? error.message : 'Failed';
            setFiles((prev) =>
              prev.map((f) =>
                f.id === entry.id
                  ? {
                      ...f,
                      status: 'error',
                      serverStatus: 'error',
                      error: message,
                    }
                  : f,
              ),
            );
          }
        }
      });

      await Promise.all(workers);
    } finally {
      setActiveJobs((n) => Math.max(0, n - 1));
    }
  };

  const handleReset = () => {
    files.forEach((f) => {
      if (f.originalBlobUrl) URL.revokeObjectURL(f.originalBlobUrl);
      if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
      if (f.serverStats?.blobUrl) URL.revokeObjectURL(f.serverStats.blobUrl);
    });
    setFiles([]);
    setError(null);
  };

  const dismissFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.originalBlobUrl) URL.revokeObjectURL(target.originalBlobUrl);
      if (target?.blobUrl) URL.revokeObjectURL(target.blobUrl);
      if (target?.serverStats?.blobUrl) URL.revokeObjectURL(target.serverStats.blobUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const settingsPanel = (
    <GlassCard>
      <div className="relative flex flex-col gap-5 sm:gap-6 p-4 sm:p-6">
        <h3 className="text-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary shrink-0"
          >
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          <span className="truncate">Compression Settings</span>
        </h3>

        <div className="bg-secondary/50 border border-border/50 rounded-xl p-3 flex gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed font-medium">
            {LIMIT_REASONS.SERVER}
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-3 block">Quality</label>
          <div className="grid grid-cols-3 gap-2">
            {(['best', 'mid', 'low'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCompressionLevel(level)}
                className={`min-h-11 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  compressionLevel === level
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-background text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
                }`}
              >
                {level === 'best' && 'Best'}
                {level === 'mid' && 'Balanced'}
                {level === 'low' && 'Small'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-surface/50 border border-border/50 rounded-xl">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Output format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['original', 'webp', 'jpeg'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setOutputFormat(format)}
                className={`min-h-10 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                  outputFormat === format
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-background text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
                }`}
              >
                {format === 'original' ? 'Keep' : format}
              </button>
            ))}
          </div>
          <p className="text-xs text-subtle mt-2 leading-tight">
            {outputFormat === 'original' && 'Same type as the original (HEIC → JPEG).'}
            {outputFormat === 'webp' && 'Best size with transparency.'}
            {outputFormat === 'jpeg' && 'Smallest photos — no transparency.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1 opacity-50">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[10px] text-subtle font-medium uppercase tracking-wider">
            In-memory only — never stored
          </span>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <main className="container mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-16 sm:pb-20">
        <PageHeader
          title={
            <>
              Compress Images <span className="text-primary">Flawlessly.</span>
            </>
          }
          description="Shrink photos without wrecking quality. Processed in-memory on our servers and never stored."
        />

        {/* Mobile: settings first. Desktop: dropzone + sticky settings. */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-4 items-stretch lg:items-start mb-12 sm:mb-16">
          <div className="order-1 lg:order-2 w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-24">
            {settingsPanel}
          </div>

          <div className="order-2 lg:order-1 w-full lg:flex-1 min-w-0">
            {errorVisible ? (
              <div className="max-w-xl mx-auto mb-4 sm:mb-6 p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between gap-3 text-destructive">
                <span className="text-sm font-semibold">{errorVisible}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="shrink-0 min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg hover:opacity-70"
                  aria-label="Dismiss error"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : null}

            {files.length === 0 ? (
              <Dropzone
                onFileSelect={handleFilesSelect}
                isCompressing={isProcessing}
                message="Drop photos to compress"
              />
            ) : (
              <div className="w-full space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Your images
                    {isProcessing ? (
                      <span className="ml-2 text-sm font-medium text-muted-foreground">
                        · working…
                      </span>
                    ) : null}
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {files.filter((f) => f.status === 'done').length > 1 ? (
                      <button
                        type="button"
                        onClick={downloadAllAsZip}
                        disabled={isZipping}
                        className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-2 bg-primary/10 px-3 sm:px-4 min-h-10 rounded-xl transition-all hover:bg-primary/20"
                      >
                        {isZipping ? (
                          <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        )}
                        Download ZIP
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 min-h-10 px-1"
                    >
                      Start over
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {files.map((file) => {
                    if (file.status === 'done') {
                      return (
                        <ResultCard
                          key={file.id}
                          originalFile={file.fileRaw!}
                          originalUrl={file.originalBlobUrl}
                          compressedUrl={file.blobUrl || ''}
                          compressedSize={file.compressedSize}
                          outputFormat={file.outputFormat || 'webp'}
                          stats={{
                            originalSize: formatBytes(file.originalSize),
                            compressedSize: formatBytes(file.compressedSize),
                            compressionRatio: 'N/A',
                            reduction: `${Math.round(
                              ((file.originalSize - file.compressedSize) / file.originalSize) * 100,
                            )}%`,
                            timeTaken: `${(file.serverStats?.time || 0).toFixed(0)}ms`,
                          }}
                          onDismiss={() => dismissFile(file.id)}
                        />
                      );
                    }

                    if (file.status === 'error') {
                      return (
                        <div
                          key={file.id}
                          className="w-full max-w-5xl mx-auto p-4 sm:p-6 rounded-2xl border border-destructive/30 bg-destructive/10 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {file.originalName}
                            </p>
                            <p className="text-sm text-destructive">
                              {file.error || 'Compression failed. Try again.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissFile(file.id)}
                            className="text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 shrink-0 min-h-10"
                          >
                            Dismiss
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={file.id}
                        className="w-full max-w-5xl mx-auto p-4 sm:p-6 rounded-2xl border border-border/50 bg-secondary/30 flex items-center gap-4"
                      >
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {file.originalName}
                          </p>
                          <p className="text-sm text-muted-foreground">Compressing…</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center mt-6 sm:mt-8">
                  <Dropzone
                    onFileSelect={handleFilesSelect}
                    isCompressing={isProcessing}
                    message="Add more images"
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
