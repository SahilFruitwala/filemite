"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Dropzone from '@/components/Dropzone';
import { CompressedFile } from '@/types';

type TargetFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export default function ConvertPage() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('webp');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
      const newFiles: CompressedFile[] = selectedFiles.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          originalName: file.name,
          originalSize: file.size,
          originalBlobUrl: URL.createObjectURL(file),
          compressedSize: 0,
          blobUrl: '',
          status: 'pending',
          fileRaw: file
      }));

      setFiles(prev => [...prev, ...newFiles]);
  };

  const handleProcessFiles = async () => {
      const pendingFiles = files.filter(f => f.status === 'pending');
      if (pendingFiles.length === 0) return;

      setIsProcessing(true);
      
      for (const fileObj of pendingFiles) {
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing' } : f));

            const formData = new FormData();
            formData.append('file', fileObj.fileRaw);
            formData.append('format', targetFormat);
            formData.append('level', 'lossless'); // Default to lossless for conversion
            formData.append('speed', 'fast');
            
            try {
                const response = await fetch('/api/compress', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Conversion failed');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
                    ...f, 
                    status: 'done',
                    compressedSize: blob.size,
                    blobUrl: url
                } : f));

            } catch (error) {
                console.error(error);
                 setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary opacity-[0.08] blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-white">
            Convert image formats <br />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">instantly and Lossless.</span>
          </h1>

            <div className="max-w-xl mx-auto mb-16">
                 <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group animate-[fadeIn_0.3s_ease-out]">
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                     <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M7 21L21 7M7 3l14 14"/></svg>
                                Target Format
                            </h3>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {(['webp', 'png', 'jpeg', 'avif'] as const).map((format) => (
                                <button
                                    key={format}
                                    onClick={() => setTargetFormat(format)}
                                    className={`py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200 border uppercase ${
                                        targetFormat === format 
                                            ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' 
                                            : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {format}
                                </button>
                            ))}
                        </div>

                        {files.some(f => f.status === 'pending') && (
                             <div className="mt-2 flex justify-end">
                                <button
                                    onClick={handleProcessFiles}
                                    disabled={isProcesssing}
                                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {isProcesssing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Converting...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                            Convert All to {targetFormat.toUpperCase()}
                                        </>
                                    )}
                                </button>
                             </div>
                        )}
                     </div>
                 </div>
            </div>
        </div>

        <div className="mb-32">
            {files.length === 0 ? (
                 <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcesssing} />
            ) : (
                <div className="w-full max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Converted Images</h2>
                        <button 
                            onClick={handleReset}
                            className="text-sm text-gray-400 hover:text-white underline underline-offset-4"
                        >
                            Start Over
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {files.map((file) => (
                            <div key={file.id} className="bg-secondary border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                        {file.blobUrl || file.originalBlobUrl ? (
                                            <img src={file.blobUrl || file.originalBlobUrl} alt="Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="animate-pulse w-full h-full bg-white/5"></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.originalName}</h3>
                                        <div className="flex items-center gap-3 text-xs mt-1">
                                            {file.status === 'done' ? (
                                                <>
                                                    <span className="text-gray-400">{formatSize(file.originalSize)}</span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
                                                    <span className="text-white font-bold">{formatSize(file.compressedSize)}</span>
                                                </>
                                            ) : file.status === 'processing' ? (
                                                <span className="text-primary flex items-center gap-1">
                                                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                    Converting...
                                                </span>
                                             ) : file.status === 'pending' ? (
                                                <span className="text-gray-500">Ready to convert</span> 
                                            ) : (
                                                 <span className="text-error">Error</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {file.status === 'done' && (
                                        <a 
                                            href={file.blobUrl} 
                                            download={`${file.originalName.replace(/\.[^/.]+$/, "")}.${targetFormat}`}
                                            className="bg-primary/10 hover:bg-primary hover:text-white text-primary px-6 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 border border-primary/20"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            Download
                                        </a>
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
      </main>
      
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/10">
        &copy; {new Date().getFullYear()} ImageCompress. All rights reserved.
      </footer>
    </div>
  );
}
