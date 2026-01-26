"use client";

import imageCompression from 'browser-image-compression';
import React, { useState } from 'react';
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
                    fileType: 'image/webp',
                    initialQuality: compressionLevel === 'best' ? 0.95 : compressionLevel === 'mid' ? 0.8 : 0.6,
                };
                
                const compressedBlob = await imageCompression(file, options);
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
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                                    Compression Settings
                                </h3>
                                <div className="flex gap-2">
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                        <button 
                                            onClick={() => setProcessingMode('client')}
                                            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${processingMode === 'client' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Browser
                                        </button>
                                        <button 
                                            onClick={() => setProcessingMode('server')}
                                            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${processingMode === 'server' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Server
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setUseTargetSize(!useTargetSize);
                                            if (!useTargetSize) setTargetSize('');
                                        }}
                                        className={`text-xs px-3 py-1 rounded-full border transition-all ${useTargetSize ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                    >
                                        {useTargetSize ? 'Mode: Target Size' : 'Mode: Manual Quality'}
                                    </button>
                                </div>
                            </div>

                             <div className="relative">
                                 {/* Manual Quality Controls */}
                                 <div className={`transition-all duration-300 ${useTargetSize ? 'opacity-20 blur-sm pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                                    <label className="text-sm text-gray-400 mb-3 block">Quality Preset</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['best', 'mid', 'low'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => !useTargetSize && setCompressionLevel(level)}
                                                disabled={useTargetSize}
                                                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                                                    compressionLevel === level 
                                                        ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' 
                                                        : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                {level === 'best' && 'Best'}
                                                {level === 'mid' && 'Balanced'}
                                                {level === 'low' && 'Small'}
                                            </button>
                                        ))}
                                    </div>
                                 </div>

                                 {/* Target Size Overlay/Section */}
                                 <div className={`mt-6 pt-6 border-t border-white/10 transition-all duration-300 ${!useTargetSize ? 'opacity-50' : 'opacity-100'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${useTargetSize ? 'bg-primary' : 'bg-white/10'}`}
                                                 onClick={() => setUseTargetSize(!useTargetSize)}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${useTargetSize ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div>
                                                <span className={`block text-sm font-medium transition-colors ${useTargetSize ? 'text-white' : 'text-gray-400'}`}>Specify Target Size</span>
                                                <span className="text-xs text-gray-500">Compress to a specific size (e.g. 100KB)</span>
                                            </div>
                                        </div>
                                        
                                        <div className={`relative transition-all duration-300 ${useTargetSize ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none'}`}>
                                            <input
                                                type="number"
                                                value={targetSize}
                                                onChange={(e) => setTargetSize(e.target.value)}
                                                placeholder="100"
                                                min="1"
                                                className="w-28 bg-black/40 border border-white/20 rounded-xl pl-4 pr-10 py-2 text-right text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">KB</span>
                                        </div>
                                    </div>
                                 </div>

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
                        <h2 className="text-2xl font-bold text-white">Your Optimized Images</h2>
                        <button 
                            onClick={handleReset}
                            className="text-sm text-gray-400 hover:text-white underline underline-offset-4"
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
                                    link.download = `optimized-${file.originalName.replace(/\.[^/.]+$/, "")}.webp`;
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
