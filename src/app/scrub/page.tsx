
"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Dropzone from '@/components/Dropzone';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

interface ExifData {
    [key: string]: any;
}

interface ScannedFile {
    id: string;
    file: File;
    previewUrl: string;
    metadata: ExifData | null;
    status: 'pending' | 'scanning' | 'scanned' | 'scrubbing' | 'done' | 'error';
    scrubbedUrl?: string; 
}

export default function ScrubPage() {
  const [file, setFile] = useState<ScannedFile | null>(null);

  const handleFileSelect = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const selectedFile = selectedFiles[0]; // Single file for now to keep it simple

    const newFile: ScannedFile = {
        id: Math.random().toString(36).substr(2, 9),
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        metadata: null,
        status: 'scanning'
    };

    setFile(newFile);
    await scanMetadata(newFile);
  };

  const scanMetadata = async (fileItem: ScannedFile) => {
    try {
        const formData = new FormData();
        formData.append('file', fileItem.file);

        const res = await fetch('/api/scrub?action=view', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Failed to scan');
        
        const data = await res.json();
        setFile(prev => prev ? { ...prev, metadata: data.metadata, status: 'scanned' } : null);
    } catch (e) {
        console.error(e);
        setFile(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  const handleScrub = async () => {
    if (!file) return;
    setFile(prev => prev ? { ...prev, status: 'scrubbing' } : null);

    try {
        const formData = new FormData();
        formData.append('file', file.file);

        const res = await fetch('/api/scrub?action=scrub', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Failed to scrub');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        setFile(prev => prev ? { ...prev, scrubbedUrl: url, status: 'done' } : null);
    } catch (e) {
        console.error(e);
        setFile(prev => prev ? { ...prev, status: 'error' } : null);
    }
  };

  const formatMetadata = (meta: ExifData) => {
      // Filter out buffer/binary data which is messy to display
      return Object.entries(meta)
          .filter(([_, value]) => typeof value !== 'object' || value === null)
          .map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-gray-400 text-sm font-mono">{key}</span>
                  <span className="text-white text-sm truncate max-w-[200px]">{String(value)}</span>
              </div>
          ));
  };

  const hasGps = (meta: any) => {
      // check for common GPS fields if needed, mostly sharp returns them in top level or 'exif' block
      // Simplification: just checking if 'gps' or similar exists in keys could be enough
      return false; 
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0E14] text-white">
      {/* Background Glows */}

      <BackgroundGlow color="emerald" />
      
      <Navbar />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <PageHeader 
            title={<>Privacy First. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Scrub Metadata.</span></>}
            description="View hidden data in your photos (GPS, Model, Settings) and strip it clean before sharing."
        />

        {!file ? (
             <div className="max-w-3xl mx-auto">
                <Dropzone onFileSelect={handleFileSelect} isCompressing={false} />
             </div>
        ) : (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Image & Status */}
                <div className="space-y-6">
                    <GlassCard className="p-4">
                        <div className="relative aspect-square md:aspect-video rounded-xl overflow-hidden bg-black/50 mb-4">
                             <img src={file.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex justify-between items-center">
                             <div>
                                 <h3 className="font-medium truncate max-w-[200px]">{file.file.name}</h3>
                                 <p className="text-sm text-gray-400">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                             </div>
                             <button onClick={() => setFile(null)} className="text-sm text-red-400 hover:text-red-300">
                                 Remove
                             </button>
                        </div>
                    </GlassCard>

                    {file.status === 'done' && file.scrubbedUrl && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Image Scrubbed!</h3>
                            <p className="text-gray-400 mb-6 text-sm">All metadata has been removed successfully.</p>
                            <a 
                                href={file.scrubbedUrl} 
                                download={`scrubbed-${file.file.name}`}
                                className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-8 rounded-xl transition-all"
                            >
                                Download Safe Image
                            </a>
                        </div>
                    )}
                </div>

                {/* Right Column: Metadata & Actions */}
                <GlassCard className="h-fit max-h-[800px] overflow-hidden flex flex-col p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            Metadata Report
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-6">
                        {file.status === 'scanning' ? (
                            <div className="py-12 text-center">
                                <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Scanning image data...</p>
                            </div>
                        ) : file.metadata ? (
                            <div className="space-y-1">
                                {formatMetadata(file.metadata)}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No metadata found or failed to load.
                            </div>
                        )}
                    </div>

                    {file.status === 'scanned' && (
                        <div className="pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                             <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
                                <p className="text-yellow-200 text-sm flex gap-2">
                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                     Review the metadata above. Proceed to scrub to permanently remove this information.
                                </p>
                             </div>
                             <button 
                                onClick={handleScrub}
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                             >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Continue to Scrub Data
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
