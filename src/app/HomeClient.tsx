"use client";

import imageCompression from 'browser-image-compression';

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

export default function HomeClient() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');
  const [comparingFileId, setComparingFileId] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, boolean>>({}); // Track which files have comparison active
  const [targetSize, setTargetSize] = useState<string>(''); // in KB
  const [useTargetSize, setUseTargetSize] = useState(false);
  const [errorVisible, setError] = useState<string | null>(null);

  const downloadAllAsZip = async () => {
      const doneFiles = files.filter((f: CompressedFile) => f.status === 'done' && (f.blobUrl || f.clientStats?.blobUrl));
      if (doneFiles.length === 0) return;


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
                    maxSizeMB: useTargetSize && targetSize ? parseFloat(targetSize) / 1024 : undefined,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: outputFormat === 'webp' ? 'image/webp' : outputFormat === 'jpeg' ? 'image/jpeg' : file.type,
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
                if (useTargetSize && targetSize) {
                    formData.append('targetSize', (parseFloat(targetSize) * 1024).toString());
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
                        } else {
                            newFile.clientStatus = 'error';
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
                        } else {
                            newFile.serverStatus = 'error';
                        }
                    }

                    return newFile;
                }));

            } catch (error) {
                console.error(error);
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

      <main className="container mx-auto px-6 pt-32 pb-20">
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
                                             setProcessingMode(processingMode === 'client' ? 'server' : 'client');
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
                                 <div className={`transition-all duration-300 ${useTargetSize ? 'opacity-20 blur-sm pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                                    <label className="text-sm text-muted-foreground mb-3 block">Quality Preset</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {(['best', 'mid', 'low'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => !useTargetSize && setCompressionLevel(level)}
                                                disabled={useTargetSize}
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

                                 {/* Target Size Toggle Section */}
                                 <div className={`mt-6 pt-6 border-t border-border/50 transition-all duration-300`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div 
                                            className="flex items-center gap-4 cursor-pointer group/toggle"
                                            onClick={() => {
                                                setUseTargetSize(!useTargetSize);
                                                if (!useTargetSize) setTargetSize('');
                                            }}
                                        >
                                            <div className={`w-11 h-6 rounded-full p-1 transition-all duration-300 relative ${useTargetSize ? 'bg-primary' : 'bg-secondary'}`}>
                                                <div className={`w-4 h-4 bg-background rounded-full shadow-md transition-all duration-300 transform ${useTargetSize ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-semibold transition-colors ${useTargetSize ? 'text-foreground' : 'text-muted-foreground group-hover/toggle:text-foreground'}`}>Specify Target Size</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Priority over quality</span>
                                            </div>
                                        </div>
                                        
                                        <div className={`relative transition-all duration-500 origin-right ${useTargetSize ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={targetSize}
                                                    onChange={(e) => setTargetSize(e.target.value)}
                                                    placeholder="100"
                                                    min="1"
                                                    className="w-24 bg-primary/10 border border-primary/20 rounded-xl pl-3 pr-9 py-2 text-right text-foreground font-bold focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/70 pointer-events-none uppercase">KB</span>
                                            </div>
                                        </div>
                                    </div>
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

        {/* Comparison Modal - Simplified to just use Client version for now or hide if complicated */}
        {/* We can re-enable detailed comparison if needed, but benchmarking is the main goal right now. */}
        {/* Keeping it simple: clicking compare button was removed in the grid, so this modal code is currently unreachable, which is fine for the temporary benchmark view. */}

      </main>
      
      <Footer />
    </div>
  );
}
