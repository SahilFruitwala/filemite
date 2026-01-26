"use client";

import imageCompression from 'browser-image-compression';
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';

import Dropzone from '@/components/Dropzone';
import ImageCompare from '@/components/ImageCompare';
import { CompressedFile, CompressionLevel } from '@/types';

export default function Home() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');
  const [comparingFileId, setComparingFileId] = useState<string | null>(null);
  const [targetSize, setTargetSize] = useState<string>(''); // in KB
  const [useTargetSize, setUseTargetSize] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(true); // Default to true for this task

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
                clientStatus: 'processing',
                serverStatus: isBenchmarking ? 'processing' : 'pending' 
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
                // Always run client
                const clientPromise = processClient().then(res => ({ type: 'client' as const, success: true, ...res })).catch(e => ({ type: 'client' as const, success: false, error: e }));
                
                
                // Run server if benchmarking
                const serverPromise = isBenchmarking 
                    ? processServer().then(res => ({ type: 'server' as const, success: true, ...res })).catch(e => ({ type: 'server' as const, success: false, error: e }))
                    : Promise.resolve(null);

                const [clientRes, serverRes] = await Promise.all([clientPromise, serverPromise]);

                setFiles(prev => prev.map(f => {
                    if (f.id !== fileId) return f;

                    const newFile = { ...f, status: 'done' as const };

                    // Update Client Stats
                    if (clientRes.success && 'blob' in clientRes) {
                        newFile.clientStats = {
                            size: clientRes.blob.size,
                            time: clientRes.time,
                            blobUrl: URL.createObjectURL(clientRes.blob)
                        };
                        newFile.clientStatus = 'done';
                        // Default main view to client result
                        newFile.compressedSize = clientRes.blob.size;
                        newFile.blobUrl = newFile.clientStats.blobUrl;
                    } else {
                        newFile.clientStatus = 'error';
                    }

                    // Update Server Stats
                    if (serverRes && serverRes.success && 'blob' in serverRes) {
                        newFile.serverStats = {
                            size: serverRes.blob.size,
                            time: serverRes.time,
                            blobUrl: URL.createObjectURL(serverRes.blob)
                        };
                        newFile.serverStatus = 'done';
                    } else if (isBenchmarking) {
                        newFile.serverStatus = 'error';
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
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary opacity-[0.08] blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-white">
            Compress images without <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">losing a pixel.</span>
          </h1>

             {/* Compression Settings Panel */}
            <div className="max-w-xl mx-auto mb-16">
                     <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group animate-[fadeIn_0.3s_ease-out]">
                         <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                         <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                                    Compression Settings
                                </h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsBenchmarking(!isBenchmarking)}
                                        className={`text-xs px-3 py-1 rounded-full border transition-all ${isBenchmarking ? 'bg-secondary border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                    >
                                        {isBenchmarking ? 'Benchmark: ON' : 'Benchmark: OFF'}
                                    </button>
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
                     </div>


            </div>

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
                            <div key={file.id} className="bg-secondary border border-white/5 rounded-2xl p-4 animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                        {file.blobUrl ? (
                                            <img src={file.blobUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="animate-pulse w-full h-full bg-white/5"></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.originalName}</h3>
                                        <p className="text-gray-400 text-sm">{formatSize(file.originalSize)}</p>
                                    </div>
                                </div>

                                {/* Comparison Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Client Result */}
                                    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client Side</span>
                                            {file.clientStatus === 'done' && file.clientStats && (
                                                <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{file.clientStats.time.toFixed(0)}ms</span>
                                            )}
                                        </div>
                                        {file.clientStatus === 'processing' && (
                                            <div className="flex items-center gap-2 text-primary text-sm">
                                                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                                Compressing...
                                            </div>
                                        )}
                                        {file.clientStatus === 'done' && file.clientStats && (
                                            <div>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-xl font-bold text-success">{formatSize(file.clientStats.size)}</span>
                                                    <span className="text-sm text-success/70 mb-1">
                                                        -{Math.round(((file.originalSize - file.clientStats.size) / file.originalSize) * 100)}%
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = file.clientStats!.blobUrl;
                                                        link.download = `client-${file.originalName.replace(/\.[^/.]+$/, "")}.webp`;
                                                        link.click();
                                                    }}
                                                    className="mt-3 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors"
                                                >
                                                    Download Client
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Server Result */}
                                    {isBenchmarking && (
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Server Side</span>
                                                {file.serverStatus === 'done' && file.serverStats && (
                                                    <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{file.serverStats.time.toFixed(0)}ms</span>
                                                )}
                                            </div>
                                            {file.serverStatus === 'processing' && (
                                                <div className="flex items-center gap-2 text-primary text-sm">
                                                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                                    Compressing...
                                                </div>
                                            )}
                                            {file.serverStatus === 'done' && file.serverStats && (
                                                <div>
                                                    <div className="flex items-end gap-2">
                                                        <span className="text-xl font-bold text-success">{formatSize(file.serverStats.size)}</span>
                                                        <span className="text-sm text-success/70 mb-1">
                                                            -{Math.round(((file.originalSize - file.serverStats.size) / file.originalSize) * 100)}%
                                                        </span>
                                                    </div>
                                                     <button 
                                                        onClick={() => {
                                                            const link = document.createElement('a');
                                                            link.href = file.serverStats!.blobUrl;
                                                            link.download = `server-${file.originalName}`;
                                                            link.click();
                                                        }}
                                                        className="mt-3 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors"
                                                    >
                                                        Download Server
                                                    </button>
                                                </div>
                                            )}
                                            {file.serverStatus === 'error' && (
                                                <div className="text-error text-sm">Failed</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
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
      
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/10">
        &copy; {new Date().getFullYear()} ImageCompress. All rights reserved.
      </footer>
    </div>
  );
}
