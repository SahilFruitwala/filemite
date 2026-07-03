
import posthog from 'posthog-js';

import React, { useState } from 'react';
import JSZip from 'jszip';

import Dropzone from '@/components/Dropzone';
import ResultCard from '@/components/ResultCard';
import { CompressedFile, CompressionLevel } from '@/types';
import { MAX_SERVER_IMAGES, LIMIT_REASONS } from '@/lib/constants';

import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export default function HomeClient() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');
  const [errorVisible, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'original' | 'webp' | 'jpeg'>('original');

  const downloadAllAsZip = async () => {
      const doneFiles = files.filter((f: CompressedFile) => f.status === 'done' && f.blobUrl);
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
                  zip.file(`optimized-${file.originalName.replace(/\.[^/.]+$/, "")}.${extension}`, blob);
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
    if (selectedFiles.length > MAX_SERVER_IMAGES) {
        setError(`Limit exceeded: Only ${MAX_SERVER_IMAGES} images can be processed at once.`);
        selectedFiles = selectedFiles.slice(0, MAX_SERVER_IMAGES);
    }

    // Initialize file states
    const newFiles: CompressedFile[] = selectedFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        originalName: file.name,
        originalSize: file.size,
        originalBlobUrl: URL.createObjectURL(file),
        compressedSize: 0,
        blobUrl: '',
        status: 'pending',
        clientStatus: 'pending',
        serverStatus: 'pending',
        fileRaw: file // Store reference
    }));

    setFiles(prev => [...prev, ...newFiles]);

    posthog.capture('image_compression_started', {
        file_count: selectedFiles.length,
        processing_mode: 'server',
        compression_level: compressionLevel,
        output_format: outputFormat,
    });

    // Process each file
    const processFiles = async (filesToProcess: CompressedFile[], sourceFiles: File[]) => {
        for (const [index, file] of sourceFiles.entries()) {
            const fileId = filesToProcess[index].id;

            setFiles(prev => prev.map(f => f.id === fileId ? {
                ...f,
                status: 'processing',
                serverStatus: 'processing'
            } : f));

            const processServer = async () => {
                const start = performance.now();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('level', compressionLevel);
                if (outputFormat !== 'original') {
                    formData.append('format', outputFormat);
                }

                const response = await fetch('/api/compress', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error('Server compression failed');
                const blob = await response.blob();
                const end = performance.now();
                return { blob, time: end - start };
            };

            try {
                const result = await processServer();

                setFiles(prev => prev.map(f => {
                    if (f.id !== fileId) return f;

                    const newFile = { ...f, status: 'done' as const };
                    newFile.serverStats = {
                        size: result.blob.size,
                        time: result.time,
                        blobUrl: URL.createObjectURL(result.blob)
                    };
                    newFile.serverStatus = 'done';
                    newFile.compressedSize = result.blob.size;
                    newFile.blobUrl = newFile.serverStats.blobUrl;
                    newFile.outputFormat = result.blob.type.split('/')[1];
                    return newFile;
                }));

                posthog.capture('image_compression_completed', {
                    processing_mode: 'server',
                    compression_level: compressionLevel,
                    original_size_bytes: file.size,
                    compressed_size_bytes: result.blob.size,
                    reduction_percent: Math.round(((file.size - result.blob.size) / file.size) * 100),
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
                 setFiles(prev => prev.map(f => f.id === fileId ? {
                    ...f,
                    status: 'error',
                    serverStatus: 'error',
                    error: 'Failed'
                } : f));
            }
        }
    };

    setIsProcessing(true);
    await processFiles(newFiles, selectedFiles);
    setIsProcessing(false);
  };

  const handleReset = () => {
      setFiles([]);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">

      <main className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-20">
        <PageHeader
          title={<>Compress Images <span className="text-primary">Flawlessly.</span></>}
          description="Reduce image size without compromising quality. Processed in-memory and never stored."
        />

        {/* Dropzone / Result Area */}
        <div className="flex flex-col lg:flex-row gap-4 items-start mb-16">
            <div className="w-full lg:flex-1 min-w-0">
            {errorVisible && (
                <div className="max-w-xl mx-auto mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between text-destructive animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span className="text-sm font-bold">{errorVisible}</span>
                    </div>
                    <button onClick={() => setError(null)} className="hover:opacity-70">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            )}
            {files.length === 0 ? (
                 <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcesssing} />
            ) : (
                <div className="w-full space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Your Optimized Images</h2>
                        <div className="flex items-center gap-4">
                            {files.filter((f: CompressedFile) => f.status === 'done').length > 1 && (
                                <button
                                    onClick={downloadAllAsZip}
                                    disabled={isZipping}
                                    className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl transition-all hover:bg-primary/20"
                                >
                                    {isZipping ? (
                                        <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    )}
                                    Download All (ZIP)
                                </button>
                            )}
                            <button
                                onClick={handleReset}
                                className="text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4"
                            >
                                Start Over
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {files.filter(f => f.status === 'done').map((file) => (
                            <ResultCard
                                key={file.id}
                                originalFile={file.fileRaw!}
                                originalUrl={file.originalBlobUrl}
                                compressedUrl={file.blobUrl || ''}
                                compressedSize={file.compressedSize}
                                outputFormat={file.outputFormat || 'webp'}
                                stats={{
                                    originalSize: formatSize(file.originalSize),
                                    compressedSize: formatSize(file.compressedSize),
                                    compressionRatio: 'N/A',
                                    reduction: `${Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100)}%`,
                                    timeTaken: `${(file.serverStats?.time || 0).toFixed(0)}ms`
                                }}
                                onReset={handleReset}
                            />
                        ))}
                    </div>
                     <div className='flex justify-center mt-8'>
                        <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcesssing} />
                     </div>
                </div>
            )}
            </div>

            {/* Compression Settings Panel */}
            <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 lg:sticky lg:top-24">
                     <GlassCard>
                         <div className="relative flex flex-col gap-6 p-6">
                             <h3 className="text-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                                 <span className="truncate">Compression Settings</span>
                             </h3>

                            <div className="bg-secondary/50 border border-border/50 rounded-xl p-3 flex gap-3">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Bulk Upload Limits</span>
                                    <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">
                                        {LIMIT_REASONS.SERVER}
                                    </p>
                                </div>
                            </div>

                             <div className="relative">
                                 {/* Manual Quality Controls */}
                                 <div>
                                    <label className="text-sm text-muted-foreground mb-3 block">Quality Preset</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {(['best', 'mid', 'low'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setCompressionLevel(level)}
                                                className={`py-3 sm:py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border ${
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

                                 {/* Format Selection */}
                                 <div className="mt-4 p-3 bg-surface/50 border border-border/50 rounded-xl">
                                     <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Output Format</label>
                                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                         {(['original', 'webp', 'jpeg'] as const).map((format) => (
                                              <button
                                                  key={format}
                                                  onClick={() => setOutputFormat(format)}
                                                  className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                                                      outputFormat === format
                                                          ? 'bg-primary/10 text-primary border-primary/20'
                                                          : 'bg-background text-muted-foreground border-transparent hover:bg-accent hover:text-foreground'
                                                  }`}
                                              >
                                                 {format === 'original' ? 'Original' : format.toUpperCase()}
                                             </button>
                                         ))}
                                     </div>
                                     <p className="text-xs text-subtle mt-2 leading-tight">
                                         {outputFormat === 'original' && "Keeps the same file type as the original."}
                                         {outputFormat === 'webp' && "Best compression with transparency."}
                                         {outputFormat === 'jpeg' && "Small size, but no transparency support."}
                                     </p>
                                     <p className="text-xs text-muted-foreground mt-2 leading-tight bg-secondary/50 border border-border/50 rounded-lg p-2">
                                         Note: compressed PNGs use a 256-color palette. Photos and images with smooth gradients may show slight banding — pick WebP for those.
                                     </p>
                                 </div>
                             </div>

                             {/* Privacy Note */}
                             <div className="flex items-center justify-center gap-2 pt-2 opacity-40 hover:opacity-100 transition-opacity">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span className="text-[10px] text-subtle font-medium uppercase tracking-wider">Images are processed in-memory and never stored.</span>
                             </div>
                         </div>
                     </GlassCard>
            </div>
        </div>

      </main>

    </div>
  );
}
