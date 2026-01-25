"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';

import Dropzone from '@/components/Dropzone';

interface CompressedFile {
    id: string;
    originalName: string;
    originalSize: number;
    compressedSize: number;
    blobUrl: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    error?: string;
}

type CompressionLevel = 'best' | 'mid' | 'low';

export default function Home() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('mid');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
    setIsProcessing(true);
    
    // Initialize file states
    const newFiles: CompressedFile[] = selectedFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        originalName: file.name,
        originalSize: file.size,
        compressedSize: 0,
        blobUrl: '',
        status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const [index, file] of selectedFiles.entries()) {
        const fileId = newFiles[index].id;
        
        // Update status to processing
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('level', compressionLevel);

        try {
            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Compression failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            setFiles(prev => prev.map(f => f.id === fileId ? { 
                ...f, 
                status: 'done',
                compressedSize: blob.size,
                blobUrl: url
            } : f));

        } catch (error) {
            console.error(error);
             setFiles(prev => prev.map(f => f.id === fileId ? { 
                ...f, 
                status: 'error',
                error: 'Failed'
            } : f));
        }
    }
    setIsProcessing(false);
  };

  const handleReset = () => {
      setFiles([]);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-center">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary opacity-[0.08] blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-white">
            Compress images without <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">losing a pixel.</span>
          </h1>

            {/* Compression Level Selector */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex bg-secondary/50 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                    {(['best', 'mid', 'low'] as const).map((level) => (
                        <button
                            key={level}
                            onClick={() => setCompressionLevel(level)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                compressionLevel === level 
                                    ? 'bg-primary text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {level === 'best' && 'Best Quality'}
                            {level === 'mid' && 'Balanced'}
                            {level === 'low' && 'Smallest Size'}
                        </button>
                    ))}
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
                            <div key={file.id} className="bg-secondary border border-white/5 rounded-2xl p-4 flex items-center justify-between animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                        {file.blobUrl ? (
                                            <img src={file.blobUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="animate-pulse w-full h-full bg-white/5"></div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.originalName}</h3>
                                        <div className="flex items-center gap-3 text-xs mt-1">
                                            {file.status === 'done' ? (
                                                <>
                                                    <span className="text-gray-400 line-through">{formatSize(file.originalSize)}</span>
                                                    <span className="text-success font-bold">{formatSize(file.compressedSize)}</span>
                                                    <span className="bg-success/10 text-success px-2 py-0.5 rounded-full">
                                                        -{Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100)}%
                                                    </span>
                                                </>
                                            ) : file.status === 'processing' ? (
                                                <span className="text-primary flex items-center gap-1">
                                                    <span className="block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                                    Compressing...
                                                </span>
                                            ) : file.status === 'error' ? (
                                                <span className="text-error">Error</span>
                                            ) : (
                                                 <span className="text-gray-500">Pending...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {file.status === 'done' ? (
                                        <a 
                                            href={file.blobUrl} 
                                            download={`min-${file.originalName}`}
                                            className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            <span className="hidden sm:inline">Save</span>
                                        </a>
                                    ) : (
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            {file.status === 'processing' && (
                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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

        {/* Features Section */}


      </main>
      
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/10">
        &copy; {new Date().getFullYear()} ImageCompress. All rights reserved.
      </footer>
    </div>
  );
}
