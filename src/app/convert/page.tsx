"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import ResultCard from '@/components/ResultCard';
import { CompressedFile } from '@/types';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

type TargetFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export default function ConvertPage() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('webp');
  const [comparisons, setComparisons] = useState<Record<string, boolean>>({});

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

      <BackgroundGlow color="primary" />
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <PageHeader 
            title={<>Convert image formats <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">instantly and Lossless.</span></>}
        />

            <div className="max-w-xl mx-auto mb-16">
                 <GlassCard>
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 transition-opacity pointer-events-none"></div>

                     <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M7 21L21 7M7 3l14 14"/></svg>
                                Target Format
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
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
                      {/* Privacy Note */}
                      <div className="flex items-center justify-center gap-2 pt-6 opacity-40 hover:opacity-100 transition-opacity border-t border-border mt-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Images are processed in-memory and never stored.</span>
                      </div>
                  </GlassCard>
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
                            <ResultCard 
                                key={file.id} 
                                file={file} 
                                type="convert"
                                onDownload={() => {
                                    const link = document.createElement('a');
                                    link.href = file.blobUrl || '';
                                    link.download = `${file.originalName.replace(/\.[^/.]+$/, "")}.${targetFormat}`;
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
      </main>
      
      <Footer />
    </div>
  );
}
