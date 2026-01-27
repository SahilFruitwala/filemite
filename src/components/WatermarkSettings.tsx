import React, { useState, useRef } from 'react';
import GlassCard from './ui/GlassCard';

type WatermarkType = 'text' | 'image' | null;
type WatermarkPosition = 'center' | 'southeast' | 'southwest' | 'northeast' | 'northwest' | 'tile';

export interface WatermarkConfig {
    type: WatermarkType;
    text: string;
    image: File | null;
    imageUrl: string | null;
    opacity: number;
    position: WatermarkPosition;
}

interface WatermarkSettingsProps {
    config: WatermarkConfig;
    onChange: (config: WatermarkConfig) => void;
}

export default function WatermarkSettings({ config, onChange }: WatermarkSettingsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTypeChange = (type: WatermarkType) => {
        onChange({ ...config, type });
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...config, text: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            onChange({ ...config, image: file, imageUrl: url });
        }
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...config, opacity: parseInt(e.target.value) });
    };

    const handlePositionChange = (position: WatermarkPosition) => {
        onChange({ ...config, position });
    };

    const positions: { id: WatermarkPosition; label: string; icon: React.ReactNode }[] = [
        { id: 'northwest', label: 'Top Left', icon: <div className="w-full h-full border-t-2 border-l-2 border-current"></div> },
        { id: 'northeast', label: 'Top Right', icon: <div className="w-full h-full border-t-2 border-r-2 border-current"></div> },
        { id: 'center', label: 'Center', icon: <div className="w-2 h-2 bg-current rounded-full"></div> },
        { id: 'southwest', label: 'Bottom Left', icon: <div className="w-full h-full border-b-2 border-l-2 border-current"></div> },
        { id: 'southeast', label: 'Bottom Right', icon: <div className="w-full h-full border-b-2 border-r-2 border-current"></div> },
        { id: 'tile', label: 'Tile', icon: <div className="grid grid-cols-2 gap-0.5 w-full h-full"><div className="bg-current opacity-50"></div><div className="bg-current opacity-50"></div><div className="bg-current opacity-50"></div><div className="bg-current opacity-50"></div></div> },
    ];

    return (
        <GlassCard className="mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M12 19L19 12L22 15L15 22L12 19Z" />
                        <path d="M18 13L16.5 5.5L2 2L5.5 16.5L13 18" />
                        <path d="M2 2L22 22" />
                    </svg>
                    Watermark
                </h3>
                
                <div className="flex bg-black/40 rounded-lg p-1 border border-border">
                     <button
                        onClick={() => handleTypeChange(null)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${config.type === null ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-white'}`}
                    >
                        None
                    </button>
                    <button
                        onClick={() => handleTypeChange('text')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${config.type === 'text' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Text
                    </button>
                    <button
                        onClick={() => handleTypeChange('image')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${config.type === 'image' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-white'}`}
                    >
                        Image
                    </button>
                </div>
            </div>

            {config.type && (
                <div className="space-y-6">
                    {/* Content Section */}
                    <div className="bg-black/20 rounded-xl p-4 border border-border">
                        <label className="text-sm text-subtle mb-2 block font-medium">Content</label>
                        
                        {config.type === 'text' && (
                            <input
                                type="text"
                                value={config.text}
                                onChange={handleTextChange}
                                placeholder="Enter watermark text..."
                                className="w-full bg-black/40 border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                            />
                        )}

                        {config.type === 'image' && (
                            <div className="flex items-center gap-4">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-16 h-16 bg-black/40 border border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden relative group"
                                >
                                    {config.imageUrl ? (
                                        <img src={config.imageUrl} alt="Watermark" className="w-full h-full object-contain" />
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-primary transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                                    >
                                        Upload Logo
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">PNG with transparency recommended</p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleImageUpload} 
                                        className="hidden" 
                                        accept="image/png, image/webp"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Appearance Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Opacity */}
                        <div className="bg-black/20 rounded-xl p-4 border border-border">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-subtle font-medium">Opacity</label>
                                <span className="text-xs text-white font-mono bg-white/10 px-2 py-0.5 rounded">{config.opacity}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={config.opacity}
                                onChange={handleOpacityChange}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                            />
                        </div>

                        {/* Position */}
                        <div className="bg-black/20 rounded-xl p-4 border border-border">
                             <label className="text-sm text-subtle font-medium mb-3 block">Position</label>
                             <div className="grid grid-cols-3 gap-2">
                                {positions.map((pos) => (
                                    <button
                                        key={pos.id}
                                        onClick={() => handlePositionChange(pos.id)}
                                        className={`h-10 rounded-lg border flex items-center justify-center transition-all ${
                                            config.position === pos.id 
                                                ? 'bg-primary/20 border-primary text-primary' 
                                                : 'bg-surface border-transparent text-subtle hover:bg-surface-hover hover:text-gray-300'
                                        }`}
                                        title={pos.label}
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            {pos.icon}
                                        </div>
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Privacy Note */}
            <div className="flex items-center justify-center gap-2 pt-6 opacity-40 hover:opacity-100 transition-opacity border-t border-border mt-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Images are processed in-memory and never stored.</span>
            </div>
        </GlassCard>
    );
}
