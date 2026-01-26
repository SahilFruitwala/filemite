"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Dropzone from '@/components/Dropzone';
import WatermarkSettings, { WatermarkConfig } from '@/components/WatermarkSettings';
import ResultCard from '@/components/ResultCard';
import { CompressedFile } from '@/types';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';

export default function WatermarkPage() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
      <BackgroundGlow color="indigo" />
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <PageHeader 
            title={<>Add Watermark <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Instantly.</span></>}
            description="Protect your images properly. Add logos or text watermarks with full control over opacity and positioning."
        />

             {/* Watermark Settings Panel */}
            <div className="max-w-xl mx-auto mb-16">
                 <WatermarkSettings config={watermarkConfig} onChange={setWatermarkConfig} />
            </div>


        {/* Dropzone / Result Area */}
        <div className="mb-32">
            {files.length === 0 ? (
                 <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcessing} />
            ) : (
                <div className="w-full max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Watermarked Images</h2>
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
                                type="watermark"
                                onDownload={() => {
                                    const link = document.createElement('a');
                                    link.href = file.serverStats?.blobUrl || '';
                                    link.download = `watermark-${file.originalName}`;
                                    link.click();
                                }}
                            />
                        ))}
                    </div>
                     <div className='flex justify-center mt-8'>
                        <Dropzone onFileSelect={handleFilesSelect} isCompressing={isProcessing} />
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
