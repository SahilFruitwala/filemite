"use client";

import React, { useState, useRef, useEffect } from 'react';

interface ImageCompareProps {
    original: string;
    compressed: string;
}

export default function ImageCompare({ original, compressed }: ImageCompareProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = 'touches' in event 
            ? event.touches[0].clientX - rect.left 
            : (event as React.MouseEvent).clientX - rect.left;
        
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(position);
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full aspect-video rounded-xl overflow-hidden cursor-col-resize select-none bg-black"
            onMouseMove={handleMove}
            onTouchMove={handleMove}
        >
            {/* Compressed Image (Background) */}
            <img 
                src={compressed} 
                alt="Compressed" 
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
            />

            {/* Original Image (Foreground with Clip) */}
            <div 
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
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
                className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-75 z-20"
                style={{ left: `${sliderPosition}%` }}
            >
                {/* Slider Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-primary">
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-primary rounded-full"></div>
                        <div className="w-0.5 h-3 bg-primary rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
                <span className="bg-black/60 backdrop-blur-md text-white text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 font-bold">Original</span>
            </div>
            <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
                <span className="bg-primary text-white text-[10px] uppercase tracking-widest px-2 py-1 rounded shadow-lg font-bold">Optimized</span>
            </div>
        </div>
    );
}
