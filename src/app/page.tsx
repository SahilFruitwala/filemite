"use client";

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
        fileRaw: file // Store reference
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Process each file
    const processFiles = async (filesToProcess: CompressedFile[], sourceFiles: File[]) => {
        for (const [index, file] of sourceFiles.entries()) {
            const fileId = filesToProcess[index].id;
            
            // Update status to processing
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', compressionLevel);
            
            if (useTargetSize && targetSize) {
            formData.append('targetSize', (parseFloat(targetSize) * 1024).toString()); // Convert KB to Bytes
            }

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
                                <div className="flex items-center gap-2">
                                    {file.status === 'done' && (
                                        <>
                                            <button
                                                onClick={() => setComparingFileId(file.id)}
                                                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 border border-white/5"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                <span className="hidden sm:inline">Compare</span>
                                            </button>
                                            <a 
                                                href={file.blobUrl} 
                                                download={`min-${file.originalName}`}
                                                className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                <span className="hidden sm:inline">Save</span>
                                            </a>
                                        </>
                                    )}
                                    {file.status === 'processing' && (
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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

        {/* Comparison Modal */}
        {comparingFile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-[fadeIn_0.2s_ease-out]">
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setComparingFileId(null)}
                ></div>
                <div className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-full">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-white truncate">{comparingFile.originalName}</h2>
                            <p className="text-gray-400 text-sm mt-0.5">
                                {formatSize(comparingFile.originalSize)} → {formatSize(comparingFile.compressedSize)} 
                                <span className="text-success ml-2">-{Math.round(((comparingFile.originalSize - comparingFile.compressedSize) / comparingFile.originalSize) * 100)}% saved</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => setComparingFileId(null)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/40">
                        {comparingFile.originalBlobUrl && (
                            <ImageCompare 
                                original={comparingFile.originalBlobUrl} 
                                compressed={comparingFile.blobUrl} 
                            />
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                        <button 
                            onClick={() => setComparingFileId(null)}
                            className="px-6 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Close
                        </button>
                        <a 
                            href={comparingFile.blobUrl} 
                            download={`min-${comparingFile.originalName}`}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download Optimized
                        </a>
                    </div>
                </div>
            </div>
        )}

      </main>
      
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/10">
        &copy; {new Date().getFullYear()} ImageCompress. All rights reserved.
      </footer>
    </div>
  );
}
