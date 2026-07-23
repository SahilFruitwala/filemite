import posthog from 'posthog-js';
import React, { useMemo, useState } from 'react';

import Dropzone from '@/components/Dropzone';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import { formatBytes } from '@/lib/constants';

type ResizeFit = 'cover' | 'contain' | 'fill' | 'inside';

interface Preset {
  label: string;
  width: number;
  height: number;
}

const PRESETS: Preset[] = [
  { label: 'IG Square', width: 1080, height: 1080 },
  { label: 'IG Story', width: 1080, height: 1920 },
  { label: 'HD', width: 1920, height: 1080 },
  { label: 'Thumbnail', width: 400, height: 400 },
];

const FIT_OPTIONS: { value: ResizeFit; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'inside', label: 'Inside' },
];

interface ResizeResult {
  blobUrl: string;
  size: number;
  width: number;
  height: number;
}

async function resizeOne(
  file: File,
  width: number,
  height: number,
  fit: ResizeFit,
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('level', 'lossless');
  formData.append('width', String(width));
  formData.append('height', String(height));
  formData.append('fit', fit);

  const response = await fetch('/api/compress', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = 'Resize failed';
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  return response.blob();
}

export default function ResizeClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [lockAspect, setLockAspect] = useState(true);
  const [fit, setFit] = useState<ResizeFit>('cover');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResizeResult | null>(null);

  const aspectRatio = naturalSize ? naturalSize.width / naturalSize.height : null;

  const willUpscale = useMemo(() => {
    if (!naturalSize) return false;
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    return (
      (!Number.isNaN(w) && w > naturalSize.width) ||
      (!Number.isNaN(h) && h > naturalSize.height)
    );
  }, [width, height, naturalSize]);

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(url);
    setResult(null);
    setError(null);

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setWidth(String(img.naturalWidth));
      setHeight(String(img.naturalHeight));
    };
    img.src = url;
  };

  const applyPreset = (preset: Preset) => {
    setWidth(String(preset.width));
    setHeight(String(preset.height));
  };

  const handleWidthChange = (value: string) => {
    setWidth(value);
    if (lockAspect && aspectRatio) {
      const w = parseInt(value, 10);
      if (!Number.isNaN(w)) {
        setHeight(String(Math.round(w / aspectRatio)));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setHeight(value);
    if (lockAspect && aspectRatio) {
      const h = parseInt(value, 10);
      if (!Number.isNaN(h)) {
        setWidth(String(Math.round(h * aspectRatio)));
      }
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.blobUrl) URL.revokeObjectURL(result.blobUrl);
    setFile(null);
    setPreviewUrl(null);
    setNaturalSize(null);
    setWidth('');
    setHeight('');
    setResult(null);
    setError(null);
  };

  const handleResize = async () => {
    if (!file) return;
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (Number.isNaN(w) || Number.isNaN(h) || w <= 0 || h <= 0) {
      setError('Enter a valid width and height.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    posthog.capture('image_resize_started', { fit, width: w, height: h });

    try {
      const blob = await resizeOne(file, w, h, fit);
      if (result?.blobUrl) URL.revokeObjectURL(result.blobUrl);
      setResult({
        blobUrl: URL.createObjectURL(blob),
        size: blob.size,
        width: w,
        height: h,
      });
      posthog.capture('image_resize_completed', { fit, width: w, height: h, size: blob.size });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resize failed';
      setError(message);
      posthog.captureException(err);
      posthog.capture('image_resize_failed', { fit, width: w, height: h });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <main className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-20">
        <PageHeader
          title={
            <>
              Resize Images <span className="text-primary">Precisely.</span>
            </>
          }
          description="Enter exact dimensions or pick a preset. Processed in-memory and never stored."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard>
              <div className="space-y-6 p-6">
                <h3 className="text-foreground font-medium flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  Dimensions
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      disabled={!file}
                      className="min-h-10 py-2 px-2 rounded-xl text-xs font-semibold border border-border/50 bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {preset.label}
                      <span className="block text-[10px] text-subtle font-normal">
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                        Width
                      </label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        disabled={!file}
                        className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm text-foreground disabled:opacity-40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockAspect((v) => !v)}
                      disabled={!file}
                      aria-pressed={lockAspect}
                      aria-label="Lock aspect ratio"
                      className={`mt-5 shrink-0 min-h-10 min-w-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 ${
                        lockAspect
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-background border-border/50 text-muted-foreground'
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {lockAspect ? (
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        ) : (
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        )}
                        <path d={lockAspect ? 'M7 11V7a5 5 0 0 1 10 0v4' : 'M7 11V7a5 5 0 0 1 9.9-1'} />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                        Height
                      </label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        disabled={!file}
                        className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm text-foreground disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {willUpscale && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 shrink-0 mt-0.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        Target is larger than the original — quality may soften when enlarging.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Fit
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FIT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFit(option.value)}
                        disabled={!file}
                        className={`min-h-10 py-2 px-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-40 ${
                          fit === option.value
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-background text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <p className="text-xs font-semibold text-destructive">{error}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-border/50 space-y-2">
                  {file && (
                    <button
                      onClick={handleResize}
                      disabled={isProcessing}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isProcessing ? 'Resizing…' : 'Resize Image'}
                    </button>
                  )}
                  {file && (
                    <button
                      onClick={handleReset}
                      className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 min-h-10"
                    >
                      Start over
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2 space-y-8">
            {!file ? (
              <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Upload an image to resize" />
            ) : (
              <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className={`grid gap-6 ${result ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="space-y-3">
                    <p className="text-[10px] text-subtle uppercase tracking-widest font-black text-center">
                      Original
                    </p>
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-border bg-surface flex items-center justify-center">
                      <img src={previewUrl!} alt="Original" className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-xs text-subtle text-center">
                      {naturalSize ? `${naturalSize.width}×${naturalSize.height}` : ''} · {formatBytes(file.size)}
                    </p>
                  </div>

                  {result && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-subtle uppercase tracking-widest font-black text-center text-primary">
                        Resized
                      </p>
                      <div className="relative aspect-video rounded-3xl overflow-hidden border border-primary/30 bg-surface flex items-center justify-center">
                        <img src={result.blobUrl} alt="Resized" className="max-w-full max-h-full object-contain" />
                      </div>
                      <p className="text-xs text-subtle text-center">
                        {result.width}×{result.height} · {formatBytes(result.size)}
                      </p>
                      <a
                        href={result.blobUrl}
                        download={`resized-${file.name}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 py-3 rounded-xl font-bold text-sm transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
