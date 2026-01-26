"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import { CompressedFile } from '@/types';
import ImageCompare from '@/components/ImageCompare';

export default function ResizePage() {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isProcesssing, setIsProcessing] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [comparingFileId, setComparingFileId] = useState<string | null>(null);

  // Resize State
  const [resizeWidth, setResizeWidth] = useState<string>('');
  const [resizeHeight, setResizeHeight] = useState<string>('');
  const [resizeFit, setResizeFit] = useState<'cover' | 'contain' | 'fill' | 'inside'>('cover');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelect = async (selectedFiles: File[]) => {
      // Initialize file states with 'waiting' status for resize
      const newFiles: CompressedFile[] = selectedFiles.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          originalName: file.name,
          originalSize: file.size,
          originalBlobUrl: URL.createObjectURL(file),
          compressedSize: 0,
          blobUrl: '',
          status: 'waiting',
          fileRaw: file
      }));

      setFiles(prev => [...prev, ...newFiles]);
  };

  const handleProcessWaitingFiles = async () => {
      const waitingFiles = files.filter(f => f.status === 'waiting');
      if (waitingFiles.length === 0) return;

      setIsProcessing(true);
      
      const sourceFiles = waitingFiles.map(f => f.fileRaw);
      
      for (const [index, file] of sourceFiles.entries()) {
            const fileId = waitingFiles[index].id;
            
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', 'lossless');
            if (resizeWidth) formData.append('width', resizeWidth);
            if (resizeHeight) formData.append('height', resizeHeight);
            formData.append('fit', resizeFit);
            
            try {
                const response = await fetch('/api/compress', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Resize failed');

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

  const comparingFile = files.find(f => f.id === comparingFileId);
  const previewingFile = files.find(f => f.id === previewFileId);

  /* Added handleReprocess function */
  const handleReprocess = async (fileId: string, newFit: string) => {
      const fileToProcess = files.find(f => f.id === fileId);
      if (!fileToProcess) return;

      // Update status to processing
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f));

      const formData = new FormData();
      formData.append('file', fileToProcess.fileRaw);
      formData.append('level', 'lossless');
      if (resizeWidth) formData.append('width', resizeWidth);
      if (resizeHeight) formData.append('height', resizeHeight);
      formData.append('fit', newFit);
      
      try {
          const response = await fetch('/api/compress', {
              method: 'POST',
              body: formData,
          });

          if (!response.ok) throw new Error('Resize failed');

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
            Resize images with <br />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">perfect precision.</span>
          </h1>

             {/* Resize Settings Panel */}
            <div className="max-w-xl mx-auto mb-16">
                 <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group animate-[fadeIn_0.3s_ease-out]">
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                     <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="11 3 11 11 14 8 17 11 17 3"/></svg>
                                Resize & Crop
                            </h3>
                        </div>

                        <div className="grid gap-6">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-semibold">Width</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={resizeWidth}
                                            onChange={(e) => setResizeWidth(e.target.value)}
                                            placeholder="Auto"
                                            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">PX</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-semibold">Height</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={resizeHeight}
                                            onChange={(e) => setResizeHeight(e.target.value)}
                                            placeholder="Auto"
                                            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">PX</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`transition-all duration-300 overflow-hidden ${resizeWidth && resizeHeight ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-semibold">Fit Mode</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['cover', 'contain', 'fill', 'inside'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setResizeFit(mode)}
                                            className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 border capitalize ${
                                                resizeFit === mode 
                                                    ? 'bg-primary/20 text-primary border-primary' 
                                                    : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {resizeFit === 'cover' && 'Crops to fill dimensions. Aspect ratio preserved.'}
                                    {resizeFit === 'contain' && 'Fits within dimensions. Letterboxing may occur.'}
                                    {resizeFit === 'fill' && 'Stretches to exact dimensions. Retains no aspect ratio.'}
                                    {resizeFit === 'inside' && 'Resizes to be as large as possible while staying within dimensions.'}
                                </p>
                            </div>

                            {/* Aspect Ratio Hint */}
                            {((resizeWidth && !resizeHeight) || (!resizeWidth && resizeHeight)) && (
                                <div className="text-xs text-gray-500 italic flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                    Aspect ratio will be automatically preserved
                                </div>
                            )}
                        </div>
                     </div>
                     
                     {/* Action Button for Resize Tab */}
                     {/* Show this button ALWAYS if there are waiting files, unlike old page where it was conditional on tab */}
                     {files.some(f => f.status === 'waiting') && (
                         <div className="mt-6 flex flex-col items-end gap-2 animate-[fadeIn_0.3s_ease-out]">
                            {(!resizeWidth && !resizeHeight) && (
                                <span className="text-xs text-yellow-500 font-medium bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                                    ⚠️ Set width or height to start
                                </span>
                            )}
                            <button
                                onClick={handleProcessWaitingFiles}
                                disabled={isProcesssing || (!resizeWidth && !resizeHeight)}
                                className={`bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2 ${
                                    (!resizeWidth && !resizeHeight) ? 'opacity-50 cursor-not-allowed grayscale' : ''
                                }`}
                            >
                                {isProcesssing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                        Resize {files.filter(f => f.status === 'waiting').length} Images
                                    </>
                                )}
                            </button>
                         </div>
                     )}
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
                        <h2 className="text-2xl font-bold text-white">Your Resized Images</h2>
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
                                        {file.blobUrl ? (
                                            <img src={file.blobUrl} alt="Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="animate-pulse w-full h-full bg-white/5"></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.originalName}</h3>
                                        <div className="flex items-center gap-3 text-xs mt-1">
                                            {file.status === 'done' ? (
                                                <>
                                                    <span className="text-gray-400 line-through">{formatSize(file.originalSize)}</span>
                                                    <span className="text-white font-bold">New: {formatSize(file.compressedSize)}</span>
                                                </>
                                            ) : file.status === 'processing' ? (
                                                <span className="text-primary flex items-center gap-1">
                                                    <span className="block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                                    Processing...
                                                </span>
                                             ) : file.status === 'waiting' ? (
                                                <span className="text-yellow-500 flex items-center gap-1">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                    Ready to resize
                                                </span> 
                                            ) : file.status === 'error' ? (
                                                <span className="text-error">Error</span>
                                            ) : (
                                                 <span className="text-gray-500">Pending...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls Section */}
                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                    
                                    {/* Fit Mode Switcher for Done Files - Only if dimensions allow */}
                                    {file.status === 'done' && resizeWidth && resizeHeight && (
                                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                             {(['cover', 'contain', 'fill'] as const).map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleReprocess(file.id, mode)}
                                                    className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                                                        // We don't have per-file fit state, so we highlight based on global or just generic style
                                                        // Ideally we should track "last used fit" per file, but for now just showing options is enough
                                                        'text-gray-400 hover:text-white hover:bg-white/10'
                                                    }`}
                                                    title={`Reprocess with ${mode}`}
                                                >
                                                    {mode}
                                                </button>
                                             ))}
                                        </div>
                                    )}

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
                                                    download={`resized-${file.originalName}`}
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
                                        {file.status === 'waiting' && (
                                            <button
                                                onClick={() => setPreviewFileId(file.id)}
                                                className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-xs flex items-center gap-2 border border-white/5"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                Preview
                                            </button>
                                        )}
                                    </div>
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
                            download={`resized-${comparingFile.originalName}`}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download Resized
                        </a>
                    </div>
                </div>
            </div>
        )}
        
        {/* Preview Modal for Resize */}
        {previewingFile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-[fadeIn_0.2s_ease-out]">
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setPreviewFileId(null)}
                ></div>
                <div className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                         <h2 className="text-xl font-bold text-white">Resize Preview</h2>
                         <button 
                            onClick={() => setPreviewFileId(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    
                    <div className="p-8 bg-black/40 flex flex-col items-center justify-center gap-4">
                        <div className="relative border-2 border-dashed border-white/10 rounded-lg overflow-hidden flex items-center justify-center bg-black/50 transition-all duration-300"
                             style={{
                                 width: resizeWidth ? `${Math.min(parseInt(resizeWidth), 400)}px` : 'auto',
                                 height: resizeHeight ? `${Math.min(parseInt(resizeHeight), 400)}px` : 'auto',
                                 maxWidth: '100%',
                                 aspectRatio: (resizeWidth && resizeHeight) ? `${resizeWidth}/${resizeHeight}` : 'auto'
                             }}
                        >
                             {/* Hint Text if Dimensions Missing */}
                             {(!resizeWidth && !resizeHeight) && (
                                 <div className="absolute inset-0 flex items-center justify-center text-xs text-center text-gray-500 p-4 pointer-events-none z-10">
                                     Set width or height to see crop effect
                                 </div>
                             )}
                             
                             {previewingFile.originalBlobUrl && (
                                <img 
                                    src={previewingFile.originalBlobUrl} 
                                    alt="Preview"
                                    className="transition-all duration-300 max-w-full max-h-[60vh]"
                                    style={{
                                        width: resizeWidth ? '100%' : 'auto',
                                        height: resizeHeight ? '100%' : 'auto',
                                        objectFit: (resizeFit === 'inside' ? 'contain' : resizeFit) as any,
                                    }}
                                />
                             )}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                             Previewing: <span className="text-white font-mono">{resizeWidth || '?'} x {resizeHeight || '?'}</span> 
                             <span className="mx-2">•</span>
                             Mode: <span className="text-primary uppercase font-bold">{resizeFit}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
      
      <Footer />
    </div>
  );
}
