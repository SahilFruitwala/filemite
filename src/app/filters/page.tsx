"use client";

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

interface FilterResult {
    id: string;
    originalName: string;
    blobUrl: string;
    blob: Blob;
}

export default function FiltersPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<FilterResult | null>(null);

    // Filter States
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [blur, setBlur] = useState(0);
    const [sepia, setSepia] = useState(0);
    const [grayscale, setGrayscale] = useState(0);
    const [hueRotate, setHueRotate] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            const f = files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
            setResult(null);
        }
    };

    const resetFilters = () => {
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setBlur(0);
        setSepia(0);
        setGrayscale(0);
        setHueRotate(0);
    };

    const applyAestheticFilter = (type: 'vibe' | 'dreamy' | 'noir') => {
        resetFilters();
        if (type === 'vibe') {
            setSaturation(140);
            setContrast(110);
            setBrightness(105);
            setHueRotate(10);
        } else if (type === 'dreamy') {
            setBlur(2);
            setBrightness(110);
            setSaturation(120);
        } else if (type === 'noir') {
            setGrayscale(100);
            setContrast(120);
            setBrightness(90);
        }
    };

    const generateResult = async () => {
        if (!file || !canvasRef.current) return;
        setIsProcessing(true);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = previewUrl!;
        await new Promise(resolve => img.onload = resolve);

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg)`;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                setResult({
                    id: Math.random().toString(36).substr(2, 9),
                    originalName: file.name,
                    blobUrl: url,
                    blob: blob,
                });
            }
            setIsProcessing(false);
        }, file.type);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundGlow color="zinc" />
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <PageHeader 
                    title={<>Aesthetic <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted">Filters & Fine-tuning.</span></>}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-foreground font-medium flex items-center gap-2">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><circle cx="12" cy="12" r="3"/><path d="m3 3 18 18"/></svg>
                                        Adjustments
                                    </h3>
                                    <button onClick={resetFilters} className="text-xs text-muted hover:text-foreground underline">Reset</button>
                                </div>

                                <div className="space-y-4">
                                    <ControlSlider label="Brightness" value={brightness} min={0} max={200} onChange={setBrightness} />
                                    <ControlSlider label="Contrast" value={contrast} min={0} max={200} onChange={setContrast} />
                                    <ControlSlider label="Saturation" value={saturation} min={0} max={200} onChange={setSaturation} />
                                    <ControlSlider label="Blur" value={blur} min={0} max={10} onChange={setBlur} />
                                    <ControlSlider label="Sepia" value={sepia} min={0} max={100} onChange={setSepia} />
                                    <ControlSlider label="Grayscale" value={grayscale} min={0} max={100} onChange={setGrayscale} />
                                </div>

                                <div className="pt-4 border-t border-border/50">
                                    <p className="text-xs text-subtle mb-3 uppercase tracking-wider font-semibold">Presets</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <PresetButton label="Vibe" onClick={() => applyAestheticFilter('vibe')} />
                                        <PresetButton label="Dreamy" onClick={() => applyAestheticFilter('dreamy')} />
                                        <PresetButton label="Noir" onClick={() => applyAestheticFilter('noir')} />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {file && (
                            <button
                                onClick={generateResult}
                                disabled={isProcessing}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? "Processing..." : "Generate Final Image"}
                            </button>
                        )}
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {!file ? (
                            <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Upload image to start filtering" />
                        ) : (
                            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                                <div className="relative bg-surface rounded-2xl overflow-hidden border border-border aspect-video flex items-center justify-center group">
                                    <img 
                                        src={previewUrl!} 
                                        alt="Preview" 
                                        className="max-w-full max-h-full transition-all"
                                        style={{
                                            filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg)`
                                        }}
                                    />
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button onClick={() => setFile(null)} className="bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500 transition-colors">Change Image</button>
                                    </div>
                                </div>

                                {result && (
                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between animate-[fadeInUp_0.3s_ease-out]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">Filter Applied!</p>
                                                <p className="text-xs text-muted">Ready to download</p>
                                            </div>
                                        </div>
                                        <a 
                                            href={result.blobUrl} 
                                            download={`refined-${result.originalName}`}
                                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all"
                                        >
                                            Download
                                        </a>
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

function ControlSlider({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) {
    return (
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-xs text-subtle uppercase tracking-wider font-semibold">{label}</label>
                <span className="text-xs text-primary font-mono">{value}{label === 'Blur' ? 'px' : label === 'Hue' ? '°' : '%'}</span>
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
}

function PresetButton({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="py-2 px-1 rounded-lg bg-background border border-border hover:border-primary hover:text-primary transition-all text-[10px] uppercase font-bold text-muted"
        >
            {label}
        </button>
    );
}
