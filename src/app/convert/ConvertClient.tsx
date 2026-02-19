"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import ResultCard from '@/components/ResultCard';
import { CompressedFile } from '@/types';
import JSZip from 'jszip';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

type TargetFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export default function ConvertClient() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('webp');
  const [comparisons, setComparisons] = useState<Record<string, boolean>>({});

  const downloadAllAsZip = async () => {
      const doneFiles = files.filter((f: CompressedFile) => f.status === 'done' && f.blobUrl);
      if (doneFiles.length === 0) return;


      setIsZipping(true);
      try {
          const zip = new JSZip();
          for (const file of doneFiles) {
              const url = file.blobUrl;
              if (url) {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  zip.file(`converted-${file.originalName.replace(/\.[^/.]+$/, "")}.${targetFormat}`, blob);
              }
          }
          const content = await zip.generateAsync({ type: 'blob' });
          const zipUrl = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = zipUrl;
          link.download = `micropng-converted.zip`;
          link.click();
          URL.revokeObjectURL(zipUrl);
      } catch (error) {
          console.error('Error creating ZIP:', error);
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
      
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <PageHeader 
            title={<>Convert image formats <br /> <span className="text-muted-foreground">instantly and Lossless.</span></>}
        />

        <div className="flex flex-col lg:flex-row gap-8 items-start mb-16">
            <div className="w-full lg:flex-1 min-w-0">
                  <div className="mb-32">
                  {files.length === 0 ? (
                       <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcesssing} />
                  ) : (
                      <div className="w-full max-w-4xl mx-auto space-y-4">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-bold text-foreground">Converted Images</h2>
                              <div className="flex items-center gap-4">
                                  {files.filter((f: CompressedFile) => f.status === 'done').length > 1 && (
                                      <button 
                                          onClick={downloadAllAsZip}
                                          disabled={isZipping}
      
                                          className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl transition-all"
                                      >
                                          {isZipping ? (
                                              <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin"></div>
                                          ) : (
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          )}
                                          Download All (ZIP)
                                      </button>
                                  )}
                                  <button 
                                      onClick={handleReset}
                                      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                                  >
                                      Start Over
                                  </button>
                              </div>
                          </div>
      
                          <div className="grid gap-4">
                              {files.map((file) => (
                                  <ResultCard 
                                      key={file.id} 
                                      originalFile={file.fileRaw!}
                                      compressedUrl={file.blobUrl || ''}
                                      compressedSize={file.compressedSize}
                                      outputFormat={targetFormat}
                                      stats={{
                                          originalSize: formatSize(file.originalSize),
                                          compressedSize: formatSize(file.compressedSize),
                                          compressionRatio: 'N/A',
                                          reduction: file.compressedSize > 0 
                                              ? `${Math.round(((file.originalSize - file.compressedSize) / file.originalSize) * 100)}%` 
                                              : '0%',
                                          timeTaken: "0ms" // Time not tracked in this flow currently
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
                   <div className="mt-20 p-8 rounded-3xl border border-primary/10 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10 rounded-full group-hover:bg-primary/20 transition-colors"></div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground">Optimize via Command Line?</h3>
                            <p className="text-sm text-muted-foreground font-medium max-w-sm">
                                Prefer terminal? We have a high-performance CLI for recursive image optimization.
                            </p>
                        </div>
                        <Link 
                            href="/cli" 
                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/10 flex items-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                            Explore CLI
                        </Link>
                   </div>
            </div>

            <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 sticky top-8">
                 <GlassCard>



                     <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between p-6">
                            <h3 className="text-foreground font-medium flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M7 21L21 7M7 3l14 14"/></svg>
                                Target Format
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 md:p-6">
                            {(['webp', 'png', 'jpeg', 'avif'] as const).map((format) => (
                                <button
                                    key={format}
                                    onClick={() => setTargetFormat(format)}
                                    className={`py-4 px-4 rounded-xl text-sm font-bold transition-all duration-200 border uppercase tracking-wider ${
                                        targetFormat === format 
                                            ? 'bg-primary text-white border-primary shadow-sm' 
                                            : 'bg-surface text-muted-foreground border-transparent hover:bg-surface-hover hover:text-white'
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
                                            <div className="w-5 h-5 border border-primary/30 border-t-primary rounded-full animate-spin"></div>
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
                       <div className="flex items-center justify-center gap-2 p-6 opacity-40 hover:opacity-100 transition-opacity border-t border-border mt-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Images are processed in-memory and never stored.</span>
                        </div>
                 </GlassCard>
            </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
