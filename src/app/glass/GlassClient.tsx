"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import { Download, Move, Maximize2, Trash2, CheckCircle2 } from 'lucide-react';

export default function GlassClient() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    // Glass States
    const [blur, setBlur] = useState(30);
    const [opacity, setOpacity] = useState(30);
    const [glowColor, setGlowColor] = useState('#10b981');
    const [glowIntensity, setGlowIntensity] = useState(15);
    const [borderWidth, setBorderWidth] = useState(1);

    // Box Interaction States (Percentages)
    const [boxPos, setBoxPos] = useState({ x: 25, y: 25 });
    const [boxSize, setBoxSize] = useState({ w: 50, h: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialBox, setInitialBox] = useState({ x: 0, y: 0, w: 0, h: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            const f = files[0];
            setFile(f);
            const url = URL.createObjectURL(f);
            setPreviewUrl(url);

            const img = new Image();
            img.onload = () => {
                setImageSize({ width: img.width, height: img.height });
            };
            img.src = url;
            
            // Reset box to center
            setBoxPos({ x: 25, y: 25 });
            setBoxSize({ w: 50, h: 50 });
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
            setGlowColor('#14b8a6');
            setGlowIntensity(30);
            setBorderWidth(2);
        } else if (type === 'soft') {
            setBlur(100);
            setOpacity(10);
            setGlowIntensity(0);
            setBorderWidth(0);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize') => {
        e.preventDefault();
        if (action === 'drag') setIsDragging(true);
        else setIsResizing(true);

        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialBox({ ...boxPos, ...boxSize });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging && !isResizing) return;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.y) / rect.height) * 100;

        if (isDragging) {
            setBoxPos({
                x: Math.max(0, Math.min(100 - initialBox.w, initialBox.x + dx)),
                y: Math.max(0, Math.min(100 - initialBox.h, initialBox.y + dy))
            });
        } else if (isResizing) {
            setBoxSize({
                w: Math.max(10, Math.min(100 - initialBox.x, initialBox.w + dx)),
                h: Math.max(10, Math.min(100 - initialBox.y, initialBox.h + dy))
            });
        }
    }, [isDragging, isResizing, dragStart, initialBox]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    const downloadResult = async () => {
        if (!file || !previewUrl || !canvasRef.current) return;
        setIsProcessing(true);

        const img = new Image();
        img.src = previewUrl;
        await new Promise(r => img.onload = r);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas matches high-res image
        canvas.width = img.width;
        canvas.height = img.height;

        // 1. Draw original image
        ctx.drawImage(img, 0, 0);

        // 2. Prepare for Glass Box
        const bx = (boxPos.x / 100) * img.width;
        const by = (boxPos.y / 100) * img.height;
        const bw = (boxSize.w / 100) * img.width;
        const bh = (boxSize.h / 100) * img.height;

        // 3. Create blurred region
        // Note: Canvas filter is supported in modern browsers for blur
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = `blur(${blur}px)`;
            tempCtx.drawImage(img, 0, 0);
            
            // Draw blurred section into main canvas using clipping
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, (16 / rectToPx(containerRef.current)) * img.width); // Rough rounded corner approximation
            ctx.clip();
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
        }

        // 4. Draw glass surface
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity / 1000})`;
        ctx.fillRect(bx, by, bw, bh);

        // 5. Draw border
        ctx.strokeStyle = `rgba(255, 255, 255, ${(opacity / 500)})`;
        ctx.lineWidth = (borderWidth / rectToPx(containerRef.current)) * img.width;
        ctx.strokeRect(bx, by, bw, bh);

        // 6. Draw "glow" (simplified as overlay for export)
        if (glowIntensity > 0) {
            ctx.shadowBlur = (glowIntensity / rectToPx(containerRef.current)) * img.width;
            ctx.shadowColor = glowColor;
            ctx.strokeRect(bx, by, bw, bh);
        }

        const link = document.createElement('a');
        link.download = `glassmorphism-${file.name}`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsProcessing(false);
    };

    function rectToPx(el: HTMLElement | null) {
        return el ? el.getBoundingClientRect().width : 800; // fallback
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundGlow color="primary" />
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <PageHeader 
                    title={<>Glassmorphism <br /> <span className="text-muted">UI Background Designer.</span></>}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard>
                            <div className="space-y-6 p-6">
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

                        {file && (
                            <button
                                onClick={downloadResult}
                                disabled={isProcessing}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Download Final PNG
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {!file ? (
                            <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Upload image to design backgrounds" />
                        ) : (
                            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
                                <div className="text-center">
                                    <p className="text-xs text-muted">Original: {imageSize.width}x{imageSize.height}px • <span className="text-primary font-bold">Drag to move, corner to resize</span></p>
                                </div>

                                <div 
                                    ref={containerRef}
                                    className="relative rounded-3xl overflow-hidden border border-border group bg-black/50 select-none shadow-2xl"
                                    style={{
                                        aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                                        maxHeight: '600px',
                                        width: '100%',
                                        margin: '0 auto'
                                    }}
                                >
                                    {/* Base Image */}
                                    <img src={previewUrl!} alt="Base" className="absolute inset-0 w-full h-full object-contain bg-[#121212]" draggable={false} />
                                    
                                    {/* Glass Overlay Wrapper */}
                                    <div className="absolute inset-0">
                                        <div 
                                            className={`absolute cursor-move rounded-2xl border group/card pointer-events-auto shadow-2xl ${(!isDragging && !isResizing) ? 'transition-all duration-300' : ''}`}
                                            onMouseDown={(e) => handleMouseDown(e, 'drag')}
                                            style={{
                                                top: `${boxPos.y}%`,
                                                left: `${boxPos.x}%`,
                                                width: `${boxSize.w}%`,
                                                height: `${boxSize.h}%`,
                                                backdropFilter: `blur(${blur}px)`,
                                                backgroundColor: `rgba(255, 255, 255, ${opacity / 1000})`,
                                                borderColor: `rgba(255, 255, 255, ${opacity / 500})`,
                                                borderWidth: `${borderWidth}px`,
                                                boxShadow: `0 0 ${glowIntensity}px rgba(${hexToRgb(glowColor)}, 0.3), inset 0 0 ${glowIntensity/2}px rgba(${hexToRgb(glowColor)}, 0.2)`,
                                                willChange: 'top, left, width, height, backdrop-filter'
                                            }}
                                        >
                                            {/* Indicators */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/10 pointer-events-none">
                                                <Move className="text-white/50" size={32} />
                                            </div>

                                            {/* Resize Handle */}
                                            <div 
                                                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    handleMouseDown(e, 'resize');
                                                }}
                                            >
                                                <div className="w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                            </div>

                                            {/* Reflection highlight */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
                                        </div>
                                    </div>

                                    <div className="absolute top-6 right-6 z-20">
                                        <button onClick={() => setFile(null)} className="bg-black/40 backdrop-blur-md text-white p-2 rounded-xl hover:bg-red-500 transition-all shadow-lg border border-white/10" title="Remove Image">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-center flex-col items-center gap-4 text-center mt-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold animate-bounce shadow-sm">
                                        <CheckCircle2 size={14} />
                                        Interaction Enabled
                                    </div>
                                    <p className="text-muted text-sm max-w-sm">Move and resize the glass box above. Your download will be high-resolution.</p>
                                </div>
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
