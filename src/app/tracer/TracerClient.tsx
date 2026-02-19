"use client";

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import ImageTracer from 'imagetracerjs';

export default function TracerClient() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [svgOutput, setSvgOutput] = useState<string | null>(null);
    
    // Tracer Options
    const [colors, setColors] = useState(16);
    const [scale, setScale] = useState(1);
    const [strokewidth, setStrokewidth] = useState(1);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setPreviewUrl(URL.createObjectURL(files[0]));
            setSvgOutput(null);
        }
    };

    const runTracer = async () => {
        if (!file || !previewUrl) return;
        setIsProcessing(true);

        try {
            // ImageTracer needs an image URL or image data
            ImageTracer.imageToSVG(
                previewUrl,
                (svgString: string) => {
                    setSvgOutput(svgString);
                    setIsProcessing(false);
                },
                { 
                    numberofcolors: colors,
                    scale: scale,
                    strokewidth: strokewidth,
                    viewbox: true
                }
            );
        } catch (error) {
            console.error('Tracer error:', error);
            setIsProcessing(false);
        }
    };

    const downloadSvg = () => {
        if (!svgOutput) return;
        const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vectorized-${file?.name.split('.')[0] || 'result'}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <Navbar />

            <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
                <PageHeader 
                    title={<>SVG <br /> <span className="text-muted-foreground">Tracer & Vectorizer.</span></>}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard>
                            <div className="space-y-6">
                                <h3 className="text-foreground font-medium flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                    Vector Options
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs text-subtle font-semibold uppercase">Colors</label>
                                            <span className="text-xs text-primary font-mono">{colors}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={2} 
                                            max={64} 
                                            value={colors} 
                                            onChange={(e) => setColors(parseInt(e.target.value))}
                                            className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">Lower = more "stylized" look, Higher = more detail.</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs text-subtle font-semibold uppercase">Scale</label>
                                            <span className="text-xs text-primary font-mono">x{scale}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={1} 
                                            max={5} 
                                            step={0.5}
                                            value={scale} 
                                            onChange={(e) => setScale(parseFloat(e.target.value))}
                                            className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/50">
                                    {file && (
                                        <button
                                            onClick={runTracer}
                                            disabled={isProcessing}
                                            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <div className="w-5 h-5 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Tracing...
                                                </>
                                            ) : (
                                                "Vectorize Image"
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        {svgOutput && (
                            <button
                                onClick={downloadSvg}
                                className="w-full bg-surface-hover hover:bg-surface border border-border text-foreground py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Download SVG
                            </button>
                        )}
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {!file ? (
                            <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Upload logos or illustrations for vectorization" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.4s_ease-out]">
                                <div className="space-y-4">
                                    <p className="text-xs text-subtle uppercase tracking-widest font-bold text-center">Original Raster</p>
                                    <div className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-center aspect-square">
                                        <img src={previewUrl!} alt="Original" className="max-w-full max-h-full object-contain" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-xs text-subtle uppercase tracking-widest font-bold text-center">Vector Result</p>
                                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-border p-4 flex items-center justify-center aspect-square relative group">
                                        {svgOutput ? (
                                            <div 
                                                className="w-full h-full flex items-center justify-center overflow-hidden" 
                                                dangerouslySetInnerHTML={{ __html: svgOutput }}
                                            />
                                        ) : (
                                            <div className="text-muted-foreground text-sm text-center italic">
                                                {isProcessing ? "Tracing paths..." : "Initial raster displayed below. Click 'Vectorize' to generate paths."}
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button onClick={() => setFile(null)} className="bg-black/40 backdrop-blur-md text-white p-2 rounded-lg hover:bg-red-500 transition-all">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
