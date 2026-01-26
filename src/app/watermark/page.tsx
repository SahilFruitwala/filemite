"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Dropzone from '@/components/Dropzone';
import WatermarkSettings, { WatermarkConfig } from '@/components/WatermarkSettings';
import { CompressedFile } from '@/types';

export default function WatermarkPage() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500 opacity-[0.08] blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-white">
            Add Watermark <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Instantly.</span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto mb-8">
              Protect your images properly. Add logos or text watermarks with full control over opacity and positioning.
          </p>

             {/* Watermark Settings Panel */}
            <div className="max-w-xl mx-auto mb-16">
                 <WatermarkSettings config={watermarkConfig} onChange={setWatermarkConfig} />
            </div>
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
                            <div key={file.id} className="bg-secondary border border-white/5 rounded-2xl p-4 animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                         {/* Show Original Thumbnail */}
                                        <img src={file.originalBlobUrl} alt="Original" className="w-full h-full object-cover opacity-50" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.originalName}</h3>
                                        <p className="text-gray-400 text-sm">{formatSize(file.originalSize)}</p>
                                    </div>
                                </div>

                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Result</span>
                                         {file.serverStatus === 'done' && file.serverStats && (
                                                <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{file.serverStats.time.toFixed(0)}ms</span>
                                         )}
                                    </div>
                                    
                                     {file.serverStatus === 'processing' && (
                                        <div className="flex items-center gap-2 text-indigo-400 text-sm">
                                            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                                            Processing...
                                        </div>
                                    )}

                                    {file.serverStatus === 'done' && file.serverStats && (
                                        <div>
                                            {/* Preview of Watermarked Image */}
                                            <div className="w-full h-48 bg-black/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                                <img src={file.serverStats.blobUrl} alt="Watermarked" className="h-full object-contain" />
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = file.serverStats!.blobUrl;
                                                    link.download = `watermark-${file.originalName}`;
                                                    link.click();
                                                }}
                                                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-indigo-500/20"
                                            >
                                                Download Image
                                            </button>
                                        </div>
                                    )}

                                    {file.serverStatus === 'error' && (
                                        <div className="text-red-400 text-sm">Failed to watermark</div>
                                    )}
                                </div>
                            </div>
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
