
import posthog from 'posthog-js';
import React, { useState } from 'react';
import Dropzone from '@/components/Dropzone';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

interface ProcessedFile {
    id: string;
    file: File;
    previewUrl: string;
    status: 'scrubbing' | 'done' | 'error';
    scrubbedUrl?: string;
    error?: string;
}

export default function ScrubClient() {
  const [file, setFile] = useState<ProcessedFile | null>(null);

  const handleFileSelect = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const selectedFile = selectedFiles[0];

    const newFile: ProcessedFile = {
        id: Math.random().toString(36).substr(2, 9),
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        status: 'scrubbing'
    };

    setFile(newFile);
    await handleScrub(newFile);
  };

  const handleScrub = async (fileItem: ProcessedFile) => {
    try {
        const formData = new FormData();
        formData.append('file', fileItem.file);

        const res = await fetch('/api/scrub?action=scrub', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? 'Failed to scrub');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        posthog.capture('metadata_scrubbed', {
            file_format: fileItem.file.type,
            original_size_bytes: fileItem.file.size,
            scrubbed_size_bytes: blob.size,
        });

        setFile(prev => prev && prev.id === fileItem.id ? { ...prev, scrubbedUrl: url, status: 'done' } : prev);
    } catch (e: any) {
        console.error(e);
        posthog.captureException(e);
        setFile(prev => prev && prev.id === fileItem.id ? { ...prev, status: 'error', error: e?.message ?? 'Failed to process image' } : prev);
    }
  };

  const handleReset = () => {
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      if (file?.scrubbedUrl) URL.revokeObjectURL(file.scrubbedUrl);
      setFile(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <main className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-20">
        <PageHeader 
            title={<>Privacy First. <span className="text-primary">Scrub Metadata.</span></>}
            description="Drop a photo and get a clean, share-safe copy instantly — no previews, no waiting."
        />

        {!file ? (
             <div className="max-w-3xl mx-auto">
                <Dropzone onFileSelect={handleFileSelect} isCompressing={false} />
             </div>
        ) : (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Image */}
                <div className="space-y-6">
                    <GlassCard className="p-4">
                        <div className="relative aspect-square md:aspect-video rounded-xl overflow-hidden bg-surface mb-4">
                             <img src={file.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex justify-between items-center">
                             <div>
                                 <h3 className="font-medium truncate max-w-[200px] text-foreground">{file.file.name}</h3>
                                 <p className="text-sm text-muted-foreground">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                             </div>
                             <button onClick={handleReset} className="text-sm text-red-400 hover:text-red-300">
                                 Remove
                             </button>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Status & Download */}
                <GlassCard className="h-fit flex flex-col p-6 justify-center">
                    {file.status === 'scrubbing' && (
                        <div className="py-12 text-center">
                            <div className="w-8 h-8 rounded-full border border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                            <p className="text-foreground font-medium">Scrubbing metadata...</p>
                            <p className="text-muted-foreground text-sm mt-1">Stripping EXIF, GPS and camera data.</p>
                        </div>
                    )}

                    {file.status === 'error' && (
                        <div className="py-12 text-center">
                            <h3 className="text-xl font-bold text-foreground mb-2">Something went wrong</h3>
                            <p className="text-muted-foreground mb-6 text-sm">{file.error ?? 'Failed to process image. Please try again.'}</p>
                            <button
                                onClick={() => file && handleScrub({ ...file, status: 'scrubbing', error: undefined })}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all mb-3"
                            >
                                Try Again
                            </button>
                            <button onClick={handleReset} className="text-sm text-muted-foreground hover:text-foreground">
                                Choose a different image
                            </button>
                        </div>
                    )}

                    {file.status === 'done' && file.scrubbedUrl && (
                        <div className="py-8 text-center animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Image Scrubbed!</h3>
                            <p className="text-muted-foreground mb-6 text-sm">All metadata has been removed successfully.</p>
                            <a
                                href={file.scrubbedUrl}
                                download={`scrubbed-${file.file.name}`}
                                className="inline-block w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all"
                            >
                                Download Safe Image
                            </a>
                            <button onClick={handleReset} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
                                Scrub another image
                            </button>
                        </div>
                    )}
                </GlassCard>
            </div>
        )}
      </main>
    </div>
  );
}
