"use client";

import posthog from 'posthog-js';
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import WatermarkSettings, { WatermarkConfig } from '@/components/WatermarkSettings';
import ResultCard from '@/components/ResultCard';
import { CompressedFile } from '@/types';
import { MAX_SERVER_IMAGES, LIMIT_REASONS } from '@/lib/constants';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export default function WatermarkClient() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorVisible, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, boolean>>({});
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
      type: 'text', // Default to text so it's obvious what to do
      text: 'My Watermark',
      image: null,
      imageUrl: null,
      opacity: 80,
      position: 'southeast'
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
    if (selectedFiles.length > MAX_SERVER_IMAGES) {
        setError(`Limit exceeded: Only ${MAX_SERVER_IMAGES} images can be processed at once.`);
        selectedFiles = selectedFiles.slice(0, MAX_SERVER_IMAGES);
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
        fileRaw: file
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
                serverStatus: 'processing' 
            } : f));

            const processWatermark = async () => {
                const start = performance.now();
                const formData = new FormData();
                formData.append('file', file);
                
                // Add Watermark Settings
                if (watermarkConfig.type) {
                    formData.append('watermarkType', watermarkConfig.type);
                    formData.append('watermarkOpacity', watermarkConfig.opacity.toString());
                    formData.append('watermarkPosition', watermarkConfig.position);
                    
                    if (watermarkConfig.type === 'text' && watermarkConfig.text) {
                        formData.append('watermarkText', watermarkConfig.text);
                    } else if (watermarkConfig.type === 'image' && watermarkConfig.image) {
                        formData.append('watermarkImage', watermarkConfig.image);
                    }
                } else {
                    // Even if no watermark type is selected, we might want to just process it?
                    // Or require a watermark type? Let's assume user wants to process it.
                    // But our API relies on watermark params potentially.
                    // If type is null, the API might just return the image compressed/converted.
                }

                const response = await fetch('/api/watermark', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error('Watermark processing failed');
                const blob = await response.blob();
                const end = performance.now();
                return { blob, time: end - start };
            };

            try {
                const result = await processWatermark();

                posthog.capture('watermark_applied', {
                    watermark_type: watermarkConfig.type,
                    opacity: watermarkConfig.opacity,
                    position: watermarkConfig.position,
                    original_size_bytes: file.size,
                    result_size_bytes: result.blob.size,
                    time_ms: Math.round(result.time),
                });

                setFiles(prev => prev.map(f => {
                    if (f.id !== fileId) return f;

                    return {
                        ...f,
                        status: 'done',
                        serverStatus: 'done',
                        serverStats: {
                            size: result.blob.size,
                            time: result.time,
                            blobUrl: URL.createObjectURL(result.blob)
                        },
                        // For the main view, show the result as the blob
                        blobUrl: URL.createObjectURL(result.blob),
                        compressedSize: result.blob.size
                    };
                }));

            } catch (error) {
                console.error(error);
                posthog.captureException(error);
                 setFiles(prev => prev.map(f => f.id === fileId ? {
                    ...f,
                    status: 'error',
                    serverStatus: 'error',
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-center">
      
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <PageHeader 
            title={<>Add Watermark <span className="text-primary">Instantly.</span></>}
            description="Protect your images properly. Add logos or text watermarks with full control over opacity and positioning."
        />

        <div className="flex flex-col lg:flex-row gap-8 items-start mb-16">
            <div className="w-full lg:flex-1 min-w-0">
                {/* Dropzone / Result Area */}
                <div className="mb-32">
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
                         <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcessing} />
                    ) : (
                        <div className="w-full max-w-4xl mx-auto space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-foreground">Watermarked Images</h2>
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
                                        originalFile={file.fileRaw!}
                                        compressedUrl={file.serverStats?.blobUrl || ''}
                                        compressedSize={file.serverStats?.size || 0}
                                        outputFormat={file.originalName.split('.').pop() || 'png'}
                                        stats={{
                                            originalSize: formatSize(file.originalSize),
                                            compressedSize: formatSize(file.serverStats?.size || 0),
                                            compressionRatio: 'N/A',
                                            reduction: '0%', // Watermarking usually adds size
                                            timeTaken: `${(file.serverStats?.time || 0).toFixed(0)}ms`
                                        }}
                                        onReset={handleReset}
                                    />
                                ))}
                            </div>
                             <div className='flex justify-center mt-8'>
                                <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcessing} />
                             </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 sticky top-8 flex flex-col gap-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-primary uppercase tracking-tight">Bulk Upload Limits</span>
                          <p className="text-[11px] text-foreground/80 leading-relaxed font-medium">
                              {LIMIT_REASONS.SERVER}
                          </p>
                      </div>
                  </div>
                  <WatermarkSettings config={watermarkConfig} onChange={setWatermarkConfig} />
            </div>
        </div>



      </main>
      
      <Footer />
    </div>
  );
}
