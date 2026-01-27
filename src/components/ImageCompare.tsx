"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCompareProps {
    original: string;
    compressed: string;
    leftLabel?: string;
    rightLabel?: string;
}

export default function ImageCompare({ original, compressed, leftLabel = 'Original', rightLabel = 'Optimized' }: ImageCompareProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    const clipPathValue = `inset(0 ${100 - sliderPosition}% 0 0)`;

    return (
        <div 
            ref={containerRef}
            className="relative w-full aspect-video rounded-xl overflow-hidden cursor-col-resize select-none bg-background group"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* Checkerboard background for transparent images */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'conic-gradient(#fff 0.25turn, #000 0.25turn 0.5turn, #fff 0.5turn 0.75turn, #000 0.75turn)', backgroundSize: '20px 20px' }}></div>

            {/* Compressed Image (Background) */}
            <img 
                src={compressed} 
                alt="Compressed" 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
            />

            {/* Original Image (Foreground with Clip) */}
            <div 
                className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ 
                    clipPath: clipPathValue,
                    WebkitClipPath: clipPathValue
                }}
            >
                <img 
                    src={original} 
                    alt="Original" 
                    className="absolute inset-0 w-full h-full object-contain"
                    draggable={false}
                />
            </div>

            {/* Slider Line */}
            <div 
                className={`absolute inset-y-0 w-0.5 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 pointer-events-none transition-transform duration-75 ${isDragging ? 'scale-x-150' : ''}`}
                style={{ left: `${sliderPosition}%` }}
            >
                {/* Slider Handle */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-primary transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <div className="flex gap-1">
                        <div className="w-0.5 h-4 bg-primary rounded-full"></div>
                        <div className="w-0.5 h-4 bg-primary rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className={`absolute bottom-4 left-4 z-30 pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-20' : 'opacity-100'}`}>
                <span className="bg-black/60 backdrop-blur-md text-white text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded border border-border font-bold shadow-lg">{leftLabel}</span>
            </div>
            <div className={`absolute bottom-4 right-4 z-30 pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-20' : 'opacity-100'}`}>
                <span className="bg-primary text-white text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded shadow-xl font-bold">{rightLabel}</span>
            </div>
        </div>
    );
}
