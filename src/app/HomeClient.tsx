"use client";

import imageCompression from 'browser-image-compression';
import posthog from 'posthog-js';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JSZip from 'jszip';

import Dropzone from '@/components/Dropzone';
import ResultCard from '@/components/ResultCard';
import { CompressedFile, CompressionLevel } from '@/types';
import { MAX_SERVER_IMAGES, MAX_BROWSER_IMAGES, LIMIT_REASONS } from '@/lib/constants';

import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import { Terminal, ArrowRight, Github } from 'lucide-react';
import Link from 'next/link';

export default function HomeClient() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');
  const [comparingFileId, setComparingFileId] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, boolean>>({}); // Track which files have comparison active
  const [errorVisible, setError] = useState<string | null>(null);

  const downloadAllAsZip = async () => {
      const doneFiles = files.filter((f: CompressedFile) => f.status === 'done' && (f.blobUrl || f.clientStats?.blobUrl));
      if (doneFiles.length === 0) return;

      posthog.capture('zip_download_clicked', {
          file_count: doneFiles.length,
      });

      setIsZipping(true);
      try {
          const zip = new JSZip();
          for (const file of doneFiles) {
              const url = file.blobUrl || file.clientStats?.blobUrl;
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

  const [processingMode, setProcessingMode] = useState<'client' | 'server'>('client');
  const [outputFormat, setOutputFormat] = useState<'original' | 'webp' | 'jpeg'>('webp');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMob = mobileRegex.test(userAgent);
      setIsMobile(isMob);
      if (isMob) {
        setProcessingMode('server');
      }
    };
    
    checkIfMobile();
  }, []);


  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
    const limit = processingMode === 'server' ? MAX_SERVER_IMAGES : MAX_BROWSER_IMAGES;
    
    if (selectedFiles.length > limit) {
        setError(`Limit exceeded: Only ${limit} images can be processed at once in ${processingMode} mode.`);
        selectedFiles = selectedFiles.slice(0, limit);
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
        processing_mode: processingMode,
        compression_level: compressionLevel,
        output_format: outputFormat,
    });

    // Process each file
    const processFiles = async (filesToProcess: CompressedFile[], sourceFiles: File[]) => {
        for (const [index, file] of sourceFiles.entries()) {
            const fileId = filesToProcess[index].id;
            
            // Update status to processing
            setFiles(prev => prev.map(f => f.id === fileId ? { 
                ...f, 
                status: 'processing',
                clientStatus: processingMode === 'client' ? 'processing' : 'pending',
                serverStatus: processingMode === 'server' ? 'processing' : 'pending'
            } : f));

            const processClient = async () => {
                const start = performance.now();
                const options = {
                    initialQuality: compressionLevel === 'best' ? 0.95 : compressionLevel === 'mid' ? 0.8 : 0.6,
                    maxIteration: 10,
                };
                
                let compressedBlob = await imageCompression(file, options);
                
                // If it got larger, use original
                if (compressedBlob.size > file.size) {
                    compressedBlob = file;
                }
                
                const end = performance.now();
                return { blob: compressedBlob, time: end - start };
            };

            const processServer = async () => {
                const start = performance.now();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('level', compressionLevel);

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
                // Execute based on mode
                let clientRes: { success: boolean; blob?: Blob; time?: number; error?: any } | null = null;
                let serverRes: { success: boolean; blob?: Blob; time?: number; error?: any } | null = null;

                if (processingMode === 'client') {
                    try {
                        const res = await processClient();
                        clientRes = { success: true, ...res };
                    } catch (e) {
                         clientRes = { success: false, error: e };
                    }
                } else {
                     try {
                        const res = await processServer();
                        serverRes = { success: true, ...res };
                    } catch (e) {
                         serverRes = { success: false, error: e };
                    }
                }

                setFiles(prev => prev.map(f => {
                    if (f.id !== fileId) return f;

                    const newFile = { ...f, status: 'done' as const };

                    // Update Client Stats
                    if (processingMode === 'client') {
                        if (clientRes?.success && clientRes.blob) {
                            newFile.clientStats = {
                                size: clientRes.blob.size,
                                time: clientRes.time!,
                                blobUrl: URL.createObjectURL(clientRes.blob)
                            };
                             newFile.clientStatus = 'done';
                            newFile.compressedSize = clientRes.blob.size;
                            newFile.blobUrl = newFile.clientStats.blobUrl;
                            newFile.outputFormat = outputFormat === 'original' ? file.type.split('/')[1] : outputFormat;
                            posthog.capture('image_compression_completed', {
                                processing_mode: 'client',
                                compression_level: compressionLevel,
                                original_size_bytes: file.size,
                                compressed_size_bytes: clientRes.blob.size,
                                reduction_percent: Math.round(((file.size - clientRes.blob.size) / file.size) * 100),
                                time_ms: Math.round(clientRes.time!),
                                output_format: newFile.outputFormat,
                            });
                        } else {
                            newFile.clientStatus = 'error';
                            posthog.capture('image_compression_failed', {
                                processing_mode: 'client',
                                compression_level: compressionLevel,
                            });
                        }
                    }

                    // Update Server Stats
                    if (processingMode === 'server') {
                        if (serverRes?.success && serverRes.blob) {
                            newFile.serverStats = {
                                size: serverRes.blob.size,
                                time: serverRes.time!,
                                blobUrl: URL.createObjectURL(serverRes.blob)
                            };
                            newFile.serverStatus = 'done';
                            newFile.compressedSize = serverRes.blob.size;
                            newFile.blobUrl = newFile.serverStats.blobUrl;
                            newFile.outputFormat = serverRes.blob.type.split('/')[1];
                            posthog.capture('image_compression_completed', {
                                processing_mode: 'server',
                                compression_level: compressionLevel,
                                original_size_bytes: file.size,
                                compressed_size_bytes: serverRes.blob.size,
                                reduction_percent: Math.round(((file.size - serverRes.blob.size) / file.size) * 100),
                                time_ms: Math.round(serverRes.time!),
                                output_format: newFile.outputFormat,
                            });
                        } else {
                            newFile.serverStatus = 'error';
                            posthog.capture('image_compression_failed', {
                                processing_mode: 'server',
                                compression_level: compressionLevel,
                            });
                        }
                    }

                    return newFile;
                }));

            } catch (error) {
                console.error(error);
                posthog.captureException(error);
                posthog.capture('image_compression_failed', {
                    processing_mode: processingMode,
                    compression_level: compressionLevel,
                });
                 setFiles(prev => prev.map(f => f.id === fileId ? {
                    ...f,
                    status: 'error',
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

  const comparingFile = files.find(f => f.id === comparingFileId);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <PageHeader 
          title={<>Compress Images <span className="text-primary">Flawlessly.</span></>}
          description="Reduce image size without compromising quality. Fast, secure, and client-side processing."
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
                                compressedUrl={file.blobUrl || file.clientStats?.blobUrl || ''}
                                compressedSize={file.compressedSize}
                                outputFormat={file.outputFormat || 'webp'}
                                stats={{
                                    originalSize: formatSize(file.originalSize),
                                    compressedSize: formatSize(file.compressedSize),
                                    compressionRatio: 'N/A', // Computed inside? No, passed as prop implies outside. But reduction is passed.
                                    reduction: `${Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100)}%`,
                                    timeTaken: `${(file.serverStats?.time || file.clientStats?.time || 0).toFixed(0)}ms`
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
            <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 sticky top-8">
                     <GlassCard>
                         <div className="relative z-10 flex flex-col gap-6 p-6">
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                 <h3 className="text-foreground font-medium flex items-center gap-2 text-sm sm:text-base">
                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                                     <span className="truncate">Compression Settings</span>
                                 </h3>
                                 <div className="flex gap-2 w-full sm:w-auto justify-end">
                                     <div 
                                         className={`flex items-center gap-3 cursor-pointer group/mode-toggle transition-opacity duration-300`}
                                         onClick={() => {
                                             const newMode = processingMode === 'client' ? 'server' : 'client';
                                             setProcessingMode(newMode);
                                             posthog.capture('processing_mode_toggled', {
                                                 new_mode: newMode,
                                                 previous_mode: processingMode,
                                                 is_mobile: isMobile,
                                             });
                                         }}
                                         title={isMobile && processingMode === 'server' ? "Browser compression is not recommended on mobile but can be enabled" : ""}
                                     >
                                         <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${processingMode === 'client' ? 'text-primary' : 'text-muted-foreground'}`}>Browser</span>
                                         <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 relative ${processingMode === 'server' ? 'bg-primary' : 'bg-secondary'}`}>
                                             <div className={`w-3 h-3 bg-background rounded-full shadow-sm transition-all duration-300 transform ${processingMode === 'server' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                         </div>
                                         <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${processingMode === 'server' ? 'text-primary' : 'text-muted-foreground'}`}>Server</span>
                                     </div>
                                 </div>
                             </div>

                            {isMobile && processingMode === 'server' && (
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold text-primary uppercase tracking-tight">Mobile Optimization Active</span>
                                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                            Browser-side compression is difficult on mobile devices due to CPU limits. We recommend sticking with <span className="text-foreground font-bold underline decoration-primary/30 underline-offset-2">Server Mode</span> for a smoother experience.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {processingMode === 'client' && (
                                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold text-destructive uppercase tracking-tight">{isMobile ? "Warning: Performance Impact" : "Browser Mode Warning"}</span>
                                        <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                                            {isMobile 
                                                ? "Browser mode is very difficult on mobile. You may experience slow down." 
                                                : "In-browser compression depends on your device capabilities."}
                                            <span className="text-foreground font-bold underline decoration-destructive/30 underline-offset-2 ml-1"> Server Mode is recommended.</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-secondary/50 border border-border/50 rounded-xl p-3 flex gap-3">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Bulk Upload Limits</span>
                                    <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">
                                        {processingMode === 'server' ? LIMIT_REASONS.SERVER : LIMIT_REASONS.BROWSER}
                                    </p>
                                </div>
                            </div>

                             <div className="relative">
                                 {/* Manual Quality Controls */}
                                 <div className={`transition-all duration-300`}>
                                    <label className="text-sm text-muted-foreground mb-3 block">Quality Preset</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {(['best', 'mid', 'low'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setCompressionLevel(level)}
                                                className={`py-3 sm:py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                                                    compressionLevel === level 
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                                                        : 'bg-background text-muted-foreground border-transparent hover:bg-accent'
                                                }`}
                                            >
                                                {level === 'best' && 'Best'}
                                                {level === 'mid' && 'Balanced'}
                                                {level === 'low' && 'Small'}
                                            </button>
                                        ))}
                                    </div>
                                 </div>

                                 {/* Format Selection - Only for Browser Mode */}
                                 {processingMode === 'client' && (
                                     <div className="mt-4 p-3 bg-surface/50 border border-border/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                                         <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Output Format</label>
                                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                             {(['original', 'webp', 'jpeg'] as const).map((format) => (
                                                  <button
                                                      key={format}
                                                      onClick={() => setOutputFormat(format)}
                                                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                                                          outputFormat === format 
                                                              ? 'bg-primary/10 text-primary border-primary/20' 
                                                              : 'bg-background text-muted-foreground border-transparent hover:bg-accent'
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
                                     </div>
                                 )}


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

        {/* Comparison Modal - Simplified to just use Client version for now or hide if complicated */}
        {/* We can re-enable detailed comparison if needed, but benchmarking is the main goal right now. */}
        {/* Keeping it simple: clicking compare button was removed in the grid, so this modal code is currently unreachable, which is fine for the temporary benchmark view. */}


        {/* CLI Promotion Section */}
        {files.length === 0 && (
          <section className="mt-32 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                  <Terminal size={12} />
                  Developer Ready
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Prefer the <span className="text-primary">Terminal?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-md">
                  We've built a high-performance CLI for bulk processing, recursive directory optimization, and automated workflows. No browser, just pure speed.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    href="/cli" 
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    Explore CLI
                    <ArrowRight size={16} />
                  </Link>
                  <a 
                    href="https://github.com/SahilFruitwala/micropng-cli" 
                    target="_blank"
                    className="px-6 py-2.5 bg-secondary text-foreground rounded-xl font-bold text-sm flex items-center gap-2 border border-border/50 hover:bg-secondary/80 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Github size={16} />
                    GitHub
                  </a>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 blur shadow-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <GlassCard className="border-primary/10 bg-zinc-950 overflow-hidden relative shadow-2xl" hoverEffect={false}>
                  <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/50"></div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">终端 micropng-cli</span>
                  </div>
                  <div className="p-6 font-mono text-xs sm:text-sm text-zinc-100 space-y-2">
                    <div className="flex gap-2">
                      <span className="text-primary select-none font-bold">$</span>
                      <span>npm install -g micropng-cli</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-primary select-none font-bold">$</span>
                      <span>micropng-cli ./assets --recursive --replace</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 text-zinc-500 italic">
                      # Scanning 428 images...
                    </div>
                    <div className="text-emerald-400 font-bold">
                      SUCCESS: 428 images optimized (Saved 142MB)
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </section>
        )}

      </main>

      
      <Footer />
    </div>
  );
}
