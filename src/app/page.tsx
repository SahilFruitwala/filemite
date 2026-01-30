"use client";

import imageCompression from 'browser-image-compression';
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import Dropzone from '@/components/Dropzone';
import ResultCard from '@/components/ResultCard';
import { CompressedFile, CompressionLevel } from '@/types';

import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export default function Home() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');
  const [comparingFileId, setComparingFileId] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, boolean>>({}); // Track which files have comparison active
  const [targetSize, setTargetSize] = useState<string>(''); // in KB
  const [useTargetSize, setUseTargetSize] = useState(false);
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
    <div className="min-h-screen relative overflow-hidden bg-center">
      <BackgroundGlow color="primary" />

      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <PageHeader 
          title={<>Compress Images <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Flawlessly.</span></>}
        />

            {/* Compression Settings Panel */}
            <div className="max-w-xl mx-auto mb-16">
                     <GlassCard>
                         <div className="relative z-10 flex flex-col gap-6">
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                 <h3 className="text-foreground font-medium flex items-center gap-2">
                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                                     Compression Settings
                                 </h3>
                                 <div className="flex gap-2">
                                     <div 
                                         className={`flex items-center gap-3 cursor-pointer group/mode-toggle transition-opacity duration-300`}
                                         onClick={() => {
                                             setProcessingMode(processingMode === 'client' ? 'server' : 'client');
                                         }}
                                         title={isMobile && processingMode === 'server' ? "Browser compression is not recommended on mobile but can be enabled" : ""}
                                     >
                                         <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${processingMode === 'client' ? 'text-primary' : 'text-muted'}`}>Browser</span>
                                         <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 relative ${processingMode === 'server' ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]' : 'bg-surface border border-border'}`}>
                                             <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300 transform ${processingMode === 'server' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                         </div>
                                         <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${processingMode === 'server' ? 'text-primary' : 'text-muted'}`}>Server</span>
                                     </div>
                                 </div>
                             </div>

                            {processingMode === 'client' && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    <p className="text-xs text-amber-200/80 leading-relaxed">
                                        <strong className="text-amber-400 block mb-0.5">Browser Mode Warning</strong>
                                        In-browser compression might not always work as expected or produce the highest quality results. 
                                        {isMobile && " On mobile devices, it can be extremely CPU-intensive and may cause performance issues."} 
                                        <span className="text-foreground font-medium"> Server Mode</span> is recommended for the best and most reliable compression performance.
                                    </p>
                                </div>
                            )}

                             <div className="relative">
                                 {/* Manual Quality Controls */}
                                 <div className={`transition-all duration-300 ${useTargetSize ? 'opacity-20 blur-sm pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                                    <label className="text-sm text-muted mb-3 block">Quality Preset</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['best', 'mid', 'low'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => !useTargetSize && setCompressionLevel(level)}
                                                disabled={useTargetSize}
                                                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                                                    compressionLevel === level 
                                                        ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' 
                                                        : 'bg-surface text-muted border-transparent hover:bg-surface-hover hover:text-white'
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
                                         <label className="text-xs font-bold text-muted uppercase tracking-wider mb-2 block">Output Format</label>
                                         <div className="grid grid-cols-3 gap-2">
                                             {(['original', 'webp', 'jpeg'] as const).map((format) => (
                                                 <button
                                                     key={format}
                                                     onClick={() => setOutputFormat(format)}
                                                     className={`py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all duration-200 border ${
                                                         outputFormat === format 
                                                             ? 'bg-primary/20 text-primary border-primary/50' 
                                                             : 'bg-surface text-muted border-transparent hover:bg-surface-hover hover:text-white'
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
                                            <div className={`w-11 h-6 rounded-full p-1 transition-all duration-300 relative ${useTargetSize ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]' : 'bg-surface border border-border'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${useTargetSize ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-semibold transition-colors ${useTargetSize ? 'text-white' : 'text-muted group-hover/toggle:text-gray-300'}`}>Specify Target Size</span>
                                                <span className="text-[10px] text-subtle uppercase tracking-widest font-bold">Priority over quality</span>
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



        {/* Dropzone / Result Area */}
        <div className="mb-32">
            {files.length === 0 ? (
                 <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcesssing} />
            ) : (
                <div className="w-full max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-foreground">Your Optimized Images</h2>
                        <button 
                            onClick={handleReset}
                            className="text-sm text-muted hover:text-foreground underline underline-offset-4"
                        >
                            Start Over
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {files.map((file) => (
                            <ResultCard 
                                key={file.id} 
                                file={file} 
                                type="compress"
                                onDownload={() => {
                                    const link = document.createElement('a');
                                    link.href = file.blobUrl || file.clientStats?.blobUrl || '';
                                    const extension = file.outputFormat || file.fileRaw?.name.split('.').pop() || 'webp';
                                    link.download = `optimized-${file.originalName.replace(/\.[^/.]+$/, "")}.${extension}`;
                                    link.click();
                                }}
                            />
                        ))}
                    </div>
                     <div className='flex justify-center mt-8'>
                        <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcesssing} />
                     </div>
                </div>
            )}
        </div>

        {/* Comparison Modal - Simplified to just use Client version for now or hide if complicated */}
        {/* We can re-enable detailed comparison if needed, but benchmarking is the main goal right now. */}
        {/* Keeping it simple: clicking compare button was removed in the grid, so this modal code is currently unreachable, which is fine for the temporary benchmark view. */}

      </main>
      
      <Footer />
    </div>
  );
}
