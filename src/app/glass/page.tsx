"use client";

import React, { useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export default function GlassPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Glass States
    const [blur, setBlur] = useState(20);
    const [opacity, setOpacity] = useState(40);
    const [glowColor, setGlowColor] = useState('#10b981');
    const [glowIntensity, setGlowIntensity] = useState(10);
    const [borderWidth, setBorderWidth] = useState(1);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setPreviewUrl(URL.createObjectURL(files[0]));
        }
    };

    const applyPreset = (type: 'frosted' | 'neon' | 'soft') => {
        if (type === 'frosted') {
            setBlur(40);
            setOpacity(20);
            setGlowIntensity(5);
            setBorderWidth(1);
        } else if (type === 'neon') {
            setBlur(10);
            setOpacity(60);
            setGlowColor('#14b8a6'); // Teal
            setGlowIntensity(30);
            setBorderWidth(2);
        } else if (type === 'soft') {
            setBlur(100);
            setOpacity(10);
            setGlowIntensity(0);
            setBorderWidth(0);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundGlow color="primary" />
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <PageHeader 
                    title={<>Glassmorphism <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted">UI Background Designer.</span></>}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard>
                            <div className="space-y-6">
                                <h3 className="text-foreground font-medium flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 11V7h4"/><path d="M11 17h4v-4"/></svg>
                                    Glass Styles
                                </h3>

                                <div className="space-y-4">
                                    <SliderControl label="Blur Amount" value={blur} max={100} onChange={setBlur} />
                                    <SliderControl label="Surface Opacity" value={opacity} max={100} onChange={setOpacity} />
                                    <SliderControl label="Border Width" value={borderWidth} max={10} onChange={setBorderWidth} />
                                    
                                    <div>
                                        <label className="text-xs text-subtle uppercase tracking-wider font-semibold mb-2 block">Glow Color</label>
                                        <div className="flex gap-2">
                                            {['#10b981', '#14b8a6', '#22c55e', '#eab308', '#ffffff'].map(c => (
                                                <button 
                                                    key={c}
                                                    onClick={() => setGlowColor(c)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${glowColor === c ? 'border-primary' : 'border-transparent hover:scale-110'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <SliderControl label="Glow Intensity" value={glowIntensity} max={50} onChange={setGlowIntensity} />
                                </div>

                                <div className="pt-4 border-t border-border/50">
                                    <p className="text-xs text-subtle mb-3 uppercase tracking-wider font-semibold">Presets</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <PresetBtn label="Frosted" onClick={() => applyPreset('frosted')} />
                                        <PresetBtn label="Neon" onClick={() => applyPreset('neon')} />
                                        <PresetBtn label="Ultra Soft" onClick={() => applyPreset('soft')} />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2">
                        {!file ? (
                            <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Upload image to design backgrounds" />
                        ) : (
                            <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
                                <div className="relative aspect-video rounded-3xl overflow-hidden border border-border group bg-black/50">
                                    {/* Base Image */}
                                    <img src={previewUrl!} alt="Base" className="absolute inset-0 w-full h-full object-cover" />
                                    
                                    {/* Glass Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center p-12">
                                        <div 
                                            className="w-full h-full rounded-2xl border transition-all duration-300 relative group/card"
                                            style={{
                                                backdropFilter: `blur(${blur}px)`,
                                                backgroundColor: `rgba(255, 255, 255, ${opacity / 1000})`,
                                                borderColor: `rgba(255, 255, 255, ${opacity / 500})`,
                                                borderWidth: `${borderWidth}px`,
                                                boxShadow: `0 0 ${glowIntensity}px rgba(${hexToRgb(glowColor)}, 0.3), inset 0 0 ${glowIntensity/2}px rgba(${hexToRgb(glowColor)}, 0.2)`
                                            }}
                                        >
                                            {/* Reflection highlight */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-6 right-6">
                                        <button onClick={() => setFile(null)} className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black/60 transition-all">Change Image</button>
                                    </div>
                                </div>

                                <div className="flex justify-center flex-col items-center gap-4 text-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold animate-bounce">
                                        ✨ Premium Aesthetic Achieved
                                    </div>
                                    <p className="text-muted text-sm max-w-sm">Capture this look to use as a card style or hero section background in your UI projects.</p>
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

function SliderControl({ label, value, max, onChange }: { label: string, value: number, max: number, onChange: (v: number) => void }) {
    return (
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-xs text-subtle font-semibold uppercase">{label}</label>
                <span className="text-xs text-primary font-mono">{value}</span>
            </div>
            <input 
                type="range" 
                min={0} 
                max={max} 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
}

function PresetBtn({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="py-2.5 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover transition-all text-[10px] font-bold text-foreground uppercase tracking-tight"
        >
            {label}
        </button>
    );
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '255, 255, 255';
}
