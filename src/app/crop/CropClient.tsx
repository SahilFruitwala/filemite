"use client";

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import smartcrop from 'smartcrop';

interface CropResult {
    id: string;
    label: string;
    blobUrl: string;
}

export default function CropClient() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<CropResult[]>([]);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setPreviewUrl(URL.createObjectURL(files[0]));
            setResults([]);
        }
    };

    const runSmartCrop = async () => {
        if (!file || !previewUrl || !canvasRef.current) return;
        setIsProcessing(true);
        setResults([]);

        const img = new Image();
        img.src = previewUrl;
        await new Promise(resolve => img.onload = resolve);

        const targets = [
            { label: 'IG Square', width: 1080, height: 1080 },
            { label: 'IG Story', width: 1080, height: 1920 },
            { label: 'Landscape', width: 1200, height: 630 }
        ];

        const newResults: CropResult[] = [];

        for (const target of targets) {
            const result = await smartcrop.crop(img, { width: target.width, height: target.height });
            const crop = result.topCrop;
            
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            canvas.width = target.width;
            canvas.height = target.height;
            
            ctx.drawImage(
                img,
                crop.x, crop.y, crop.width, crop.height,
                0, 0, target.width, target.height
            );

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, file.type));
            if (blob) {
                newResults.push({
                    id: Math.random().toString(36).substr(2, 9),
                    label: target.label,
                    blobUrl: URL.createObjectURL(blob)
                });
            }
        }

        setResults(newResults);
        setIsProcessing(false);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <PageHeader 
                    title={<>Smart <br /> <span className="text-muted-foreground">AI-Powered Cropping.</span></>}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard>
                            <div className="space-y-6 p-6">
                                <h3 className="text-foreground font-medium flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M6 2v20M18 2v20M2 6h20M2 18h20"/></svg>
                                    Focal Detection
                                </h3>
                                
                                <p className="text-sm text-subtle leading-relaxed">
                                    Our AI detects the subject of your image and automatically crops it for popular social media aspect ratios.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                        Instagram Square (1:1)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                        Instagram Story (9:16)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                        FB / Twitter (1.91:1)
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/50">
                                    {file && (
                                        <button
                                            onClick={runSmartCrop}
                                            disabled={isProcessing}
                                            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? "Analyzing Image..." : "Magic Crop"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {!file ? (
                            <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Upload a photo with a clear subject" />
                        ) : (
                            <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                                <div className="relative aspect-video rounded-3xl overflow-hidden border border-border group bg-surface flex items-center justify-center">
                                    <img src={previewUrl!} alt="Original" className="max-w-full max-h-full object-contain" />
                                    <div className="absolute top-4 right-4">
                                        <button onClick={() => setFile(null)} className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500 transition-all">Change Image</button>
                                    </div>
                                </div>

                                {results.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        {results.map((res) => (
                                            <div key={res.id} className="space-y-3 group/item">
                                                <p className="text-[10px] text-subtle uppercase tracking-widest font-black text-center group-hover/item:text-primary transition-colors">{res.label}</p>
                                                <div className="bg-secondary rounded-2xl border border-border overflow-hidden relative shadow-sm hover:shadow-xl hover:border-primary/50 transition-all group/img duration-500">
                                                    <img src={res.blobUrl} alt={res.label} className={`w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110 ${res.label === 'IG Story' ? 'aspect-[9/16]' : res.label === 'IG Square' ? 'aspect-square' : 'aspect-[1.91/1]'}`} />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <a 
                                                            href={res.blobUrl} 
                                                            download={`smartcrop-${res.label}-${file.name}`}
                                                            className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform"
                                                        >
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <canvas ref={canvasRef} className="hidden" />
            <Footer />
        </div>
    );
}
