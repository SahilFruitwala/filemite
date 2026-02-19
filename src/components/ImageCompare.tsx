"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Move, Layout, Eye, Search } from 'lucide-react';

interface ImageCompareProps {
    original: string;
    compressed: string;
    leftLabel?: string;
    rightLabel?: string;
}

type CompMode = 'slider' | 'toggle';

export default function ImageCompare({ original, compressed, leftLabel = 'Original', rightLabel = 'Optimized' }: ImageCompareProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [imageSize, setImageSize] = useState<{ width: number, height: number } | null>(null);
    const [mode, setMode] = useState<CompMode>('slider');
    const [showOriginal, setShowOriginal] = useState(false); // For toggle mode
    const [isZooming, setIsZooming] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Load image to get dimensions
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setImageSize({ width: img.width, height: img.height });
        };
        img.src = original;
    }, [original]);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(position);
    }, []);

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleMove(e.clientX);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
    };

    const onMouseUp = useCallback(() => setIsDragging(false), []);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                handleMove(e.clientX);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                handleMove(e.touches[0].clientX);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onMouseUp);
        };
    }, [isDragging, handleMove, onMouseUp]);

    const handleZoomMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    };

    const clipPathValue = `inset(0 ${100 - sliderPosition}% 0 0)`;

    // Calculate aspect ratio for style
    const containerStyle = imageSize ? { aspectRatio: `${imageSize.width} / ${imageSize.height}` } : { aspectRatio: '16/9' };

    return (
        <div className="w-full space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-secondary/30 p-2 rounded-xl border border-border/50">
                <div className="flex gap-1 p-1 bg-background/50 rounded-lg">
                    <button 
                        onClick={() => setMode('slider')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${mode === 'slider' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Layout size={12} /> Slider
                    </button>
                    <button 
                        onClick={() => setMode('toggle')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${mode === 'toggle' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Eye size={12} /> Toggle A/B
                    </button>
                </div>

                <div className="flex items-center gap-4 px-2">
                    <button 
                        onClick={() => setIsZooming(!isZooming)}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-2 ${isZooming ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
                        title="Toggle Magnifier"
                    >
                        <Search size={16} />
                        <span className="text-[10px] font-bold uppercase hidden sm:inline">Magnifier</span>
                    </button>
                </div>
            </div>

            <div className="w-full flex items-center justify-center bg-repeating-conic rounded-2xl border border-border/50 py-4 px-2 sm:py-8 sm:px-4">
                <div 
                    ref={containerRef}
                    className="relative w-full max-h-[600px] overflow-hidden cursor-crosshair select-none group shadow-2xl rounded-lg mx-auto"
                    style={{
                        ...containerStyle,
                        maxWidth: '100%'
                    }}
                    onMouseDown={mode === 'slider' ? onMouseDown : undefined}
                    onTouchStart={mode === 'slider' ? onTouchStart : undefined}
                    onMouseMove={isZooming ? handleZoomMove : undefined}
                    onTouchMove={isZooming ? handleZoomMove : undefined}
                >
                    {/* Checkerboard background for transparent images */}
                    <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: 'conic-gradient(var(--foreground) 0.25turn, var(--background) 0.25turn 0.5turn, var(--foreground) 0.5turn 0.75turn, var(--background) 0.75turn)', 
                        backgroundSize: '20px 20px' 
                    }}></div>

                    {/* Compressed Image (Background) */}
                    <img 
                        src={compressed} 
                        alt="Compressed" 
                        className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 ${mode === 'toggle' && showOriginal ? 'opacity-0' : 'opacity-100'}`}
                        style={{ imageRendering: 'auto' }}
                        draggable={false}
                    />

                    {/* Original Image (Foreground with Clip or Toggle) */}
                    <div 
                        className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-200 ${mode === 'toggle' ? (showOriginal ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`}
                        style={mode === 'slider' ? { 
                            clipPath: clipPathValue,
                            WebkitClipPath: clipPathValue
                        } : {}}
                    >
                        <img 
                            src={original} 
                            alt="Original" 
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ imageRendering: 'auto' }}
                            draggable={false}
                        />
                    </div>

                    {/* Toggle Mode Hint */}
                    {mode === 'toggle' && (
                        <button 
                            onMouseEnter={() => setShowOriginal(true)}
                            onMouseLeave={() => setShowOriginal(false)}
                            onMouseDown={() => setShowOriginal(true)}
                            onMouseUp={() => setShowOriginal(false)}
                            className="absolute inset-0 z-40 w-full h-full cursor-pointer bg-transparent"
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Press and Hold to see Original
                            </div>
                        </button>
                    )}

                    {/* Slider Line (Only in Slider mode) */}
                    {mode === 'slider' && (
                        <div 
                            className={`absolute inset-y-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none transition-transform duration-75 ${isDragging ? 'scale-x-125' : ''}`}
                            style={{ left: `${sliderPosition}%` }}
                        >
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-transparent transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
                                <div className="w-full h-full rounded-full border-2 border-white shadow-sm bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                    <div className="flex gap-0.5">
                                        <div className="w-px h-3 bg-white"></div>
                                        <div className="w-px h-3 bg-white"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Magnifier Lens */}
                    {isZooming && (
                        <div 
                            className="absolute z-[60] w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-primary shadow-2xl overflow-hidden pointer-events-none cursor-none bg-background"
                            style={{ 
                                left: `${zoomPos.x}%`, 
                                top: `${zoomPos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)'
                            }}
                        >
                            <div className="relative w-full h-full">
                                {/* Base (Compressed) */}
                                <img 
                                    src={compressed} 
                                    className="absolute inset-0 w-full h-full object-contain"
                                    style={{ 
                                        transform: `scale(4)`,
                                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                        imageRendering: 'pixelated'
                                    }}
                                />
                                {/* Overlay (Original) */}
                                <div 
                                    className="absolute inset-0 w-full h-full overflow-hidden"
                                    style={{ 
                                        clipPath: mode === 'slider' ? `inset(0 ${100 - sliderPosition}% 0 0)` : (showOriginal ? 'none' : 'inset(0 100% 0 0)')
                                    }}
                                >
                                    <img 
                                        src={original}
                                        className="absolute inset-0 w-full h-full object-contain"
                                        style={{ 
                                            transform: `scale(4)`,
                                            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                            imageRendering: 'pixelated'
                                        }}
                                    />
                                </div>
                                {/* Label inside lens */}
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-bold px-2 rounded-full uppercase">4x Zoom</div>
                            </div>
                        </div>
                    )}

                    {/* Labels */}
                    <div className={`absolute bottom-2 left-2 z-30 pointer-events-none transition-opacity duration-300 ${isDragging || (isZooming && zoomPos.x < 20 && zoomPos.y > 80) ? 'opacity-0' : 'opacity-100'}`}>
                        <span className="bg-black/50 backdrop-blur-md text-white text-[9px] uppercase tracking-widest px-2 py-1 rounded font-bold shadow-sm">{leftLabel}</span>
                    </div>
                    <div className={`absolute bottom-2 right-2 z-30 pointer-events-none transition-opacity duration-300 ${isDragging || (isZooming && zoomPos.x > 80 && zoomPos.y > 80) ? 'opacity-0' : 'opacity-100'}`}>
                        <span className="bg-primary text-white text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-sm font-bold">{rightLabel}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-6">
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-border"></div>
                    <span>Original ({imageSize?.width}x{imageSize?.height})</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Optimized</span>
                 </div>
            </div>
        </div>
    );
}
