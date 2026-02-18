"use client";

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import { CompressedFile } from '@/types';
import JSZip from 'jszip';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Download, Scissors, RefreshCw, Maximize2, Move, Layout, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

const SOCIAL_PRESETS = [
    { label: 'IG Square', width: 1080, height: 1080, aspect: 1, icon: '📸' },
    { label: 'IG Story', width: 1080, height: 1920, aspect: 9/16, icon: '📱' },
    { label: 'FB Cover', width: 820, height: 312, aspect: 820/312, icon: '👥' },
    { label: 'Twitter', width: 1200, height: 675, aspect: 16/9, icon: '🐦' },
    { label: 'LinkedIn', width: 1200, height: 627, aspect: 1.91/1, icon: '💼' },
    { label: 'YouTube', width: 1280, height: 720, aspect: 16/9, icon: '🎥' },
];

export default function ResizePage() {
    const [file, setFile] = useState<CompressedFile | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Resize & Crop State
    const [resizeWidth, setResizeWidth] = useState<string>('1080');
    const [resizeHeight, setResizeHeight] = useState<string>('1080');
    const [resizeFit, setResizeFit] = useState<'cover' | 'contain' | 'fill' | 'inside'>('cover');
    const [lockAspectRatio, setLockAspectRatio] = useState(true);
    const [aspectRatio, setAspectRatio] = useState<number | undefined>(1);

    // Manual Crop States
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isCropMode, setIsCropMode] = useState(false);
    const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
    
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Generate a cropped preview blob from the current crop selection.
    // MUST be called while imgRef is still mounted (before setting isCropMode=false).
    const applyCrop = useCallback(() => {
        if (!completedCrop || !imgRef.current) {
            setIsCropMode(false);
            return;
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropW = completedCrop.width * scaleX;
        const cropH = completedCrop.height * scaleY;

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsCropMode(false);
            return;
        }

        ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        canvas.toBlob((blob) => {
            if (!blob) return;
            // Revoke old preview URL if any
            if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
            const url = URL.createObjectURL(blob);
            setCropPreviewUrl(url);
            // NOW it's safe to exit crop mode
            setIsCropMode(false);
        }, 'image/png');
    }, [completedCrop, cropPreviewUrl]);

    const handleFileSelect = (selectedFiles: File[]) => {
        if (selectedFiles.length > 0) {
            const f = selectedFiles[0];
            const newFile: CompressedFile = {
                id: Math.random().toString(36).substr(2, 9),
                originalName: f.name,
                originalSize: f.size,
                originalBlobUrl: URL.createObjectURL(f),
                compressedSize: 0,
                blobUrl: '',
                status: 'waiting',
                fileRaw: f
            };
            setFile(newFile);
            setIsCropMode(false);
            setCompletedCrop(undefined);
            setCrop(undefined);
            setCropPreviewUrl(null);
        }
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        if (aspectRatio) {
            const initialCrop = centerCrop(
                makeAspectCrop(
                    { unit: '%', width: 90 },
                    aspectRatio,
                    width,
                    height
                ),
                width,
                height
            );
            setCrop(initialCrop);
        }
    };

    const applyPreset = (width: number, height: number, aspect: number) => {
        setResizeWidth(width.toString());
        setResizeHeight(height.toString());
        setAspectRatio(aspect);
        setResizeFit('cover');
        setLockAspectRatio(true);

        // Update crop if in crop mode
        if (imgRef.current) {
            const { width: imgW, height: imgH } = imgRef.current;
            const newCrop = centerCrop(
                makeAspectCrop({ unit: '%', width: 90 }, aspect, imgW, imgH),
                imgW,
                imgH
            );
             setCrop(newCrop);
        }
    };

    const handleResize = async () => {
        if (!file) return;
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('file', file.fileRaw);
        formData.append('width', resizeWidth);
        formData.append('height', resizeHeight);
        formData.append('fit', resizeFit);
        formData.append('level', 'lossless');

        if (completedCrop) {
            // Need to convert relative crop to image pixels
            // CompletedCrop is already in pixels relative to the DOM image element
            // We need to scale them to the actual image resolution
            if (imgRef.current) {
                const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
                const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
                
                formData.append('cropX', Math.round(completedCrop.x * scaleX).toString());
                formData.append('cropY', Math.round(completedCrop.y * scaleY).toString());
                formData.append('cropW', Math.round(completedCrop.width * scaleX).toString());
                formData.append('cropH', Math.round(completedCrop.height * scaleY).toString());
            }
        }

        try {
            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Resize failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            setFile(prev => prev ? {
                ...prev,
                status: 'done',
                compressedSize: blob.size,
                blobUrl: url
            } : null);
        } catch (error) {
            console.error(error);
            setFile(prev => prev ? { ...prev, status: 'error' } : null);
        } finally {
            setIsProcessing(false);
        }
    };

    const previewStyle = useMemo(() => {
        const w = parseInt(resizeWidth) || 800;
        const h = parseInt(resizeHeight) || 600;
        return {
            aspectRatio: `${w} / ${h}`,
            width: '100%',
            maxWidth: '100%',
            maxHeight: '500px',
            margin: '0 auto'
        };
    }, [resizeWidth, resizeHeight]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundGlow color="primary" />
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <PageHeader 
                    title={<>Advanced <br /> <span className="text-muted">Interactive Resizer.</span></>}
                />

                {!file ? (
                    <div className="max-w-4xl mx-auto">
                        <Dropzone onFileSelect={handleFileSelect} isCompressing={false} message="Drop an image to start high-precision resizing" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto animate-[fadeIn_0.4s_ease-out]">
                        
                        {/* Editor Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            <GlassCard>
                                <div className="space-y-6 p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-foreground font-bold flex items-center gap-2">
                                            <Maximize2 size={18} className="text-primary" />
                                            Output Dimensions
                                        </h3>
                                        {file.status === 'done' && (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <CheckCircle2 size={10} /> Ready
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-subtle font-black uppercase tracking-widest">Width (px)</label>
                                            <input 
                                                type="number" 
                                                value={resizeWidth}
                                                onChange={(e) => {
                                                    setResizeWidth(e.target.value);
                                                    if (lockAspectRatio && aspectRatio) {
                                                        setResizeHeight(Math.round(parseInt(e.target.value) / aspectRatio).toString());
                                                    }
                                                }}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-subtle font-black uppercase tracking-widest">Height (px)</label>
                                            <input 
                                                type="number" 
                                                value={resizeHeight}
                                                onChange={(e) => {
                                                    setResizeHeight(e.target.value);
                                                    if (lockAspectRatio && aspectRatio) {
                                                        setResizeWidth(Math.round(parseInt(e.target.value) * aspectRatio).toString());
                                                    }
                                                }}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 py-2">
                                        <button 
                                            onClick={() => setLockAspectRatio(!lockAspectRatio)}
                                            className={`flex items-center gap-2 text-xs font-bold transition-all p-2 rounded-lg ${lockAspectRatio ? 'text-primary bg-primary/10' : 'text-muted hover:text-foreground'}`}
                                        >
                                            {lockAspectRatio ? <Layout size={14} /> : <Maximize2 size={14} />}
                                            {lockAspectRatio ? 'Aspect Ratio Locked' : 'Free Resize'}
                                        </button>
                                        {lockAspectRatio && (
                                            <div className="h-px flex-1 bg-border/50"></div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-subtle font-black uppercase tracking-widest">Scaling Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['cover', 'contain', 'fill', 'inside'] as const).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setResizeFit(mode)}
                                                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                        resizeFit === mode 
                                                            ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                                            : 'bg-surface border-transparent text-muted hover:border-border hover:text-foreground'
                                                    }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted italic">
                                            {resizeFit === 'cover' && 'Fills the box, cropping extra.'}
                                            {resizeFit === 'contain' && 'Fits inside, adds letterboxing.'}
                                            {resizeFit === 'fill' && 'Stretches image to fit.'}
                                            {resizeFit === 'inside' && 'Max size within bounds.'}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-border/50">
                                        <label className="text-[10px] text-subtle font-black uppercase tracking-widest mb-3 block">Quick Presets</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                                            {SOCIAL_PRESETS.map(preset => (
                                                <button
                                                    key={preset.label}
                                                    onClick={() => applyPreset(preset.width, preset.height, preset.aspect)}
                                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface/50 border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group"
                                                >
                                                    <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{preset.icon}</span>
                                                    <span className="text-[8px] font-black uppercase text-center leading-tight truncate w-full">{preset.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                        <button
                                            onClick={handleResize}
                                            disabled={isProcessing}
                                            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {isProcessing ? (
                                                <RefreshCw size={20} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Maximize2 size={20} />
                                                    Process Resize
                                                </>
                                            )}
                                        </button>
                                        
                                        {file.status === 'done' && (
                                            <a
                                                href={file.blobUrl}
                                                download={`resized-${file.originalName}`}
                                                className="w-full bg-surface border border-primary/30 text-primary hover:bg-primary/5 py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-sm"
                                            >
                                                <Download size={20} />
                                                Save Result
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>

                            <button 
                                onClick={() => setFile(null)} 
                                className="w-full py-4 text-xs font-bold text-muted hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Start Fresh
                            </button>
                        </div>

                        {/* Editor Preview Area */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold flex items-center gap-2 text-foreground uppercase tracking-tight">
                                        Live Editor
                                        {isCropMode && <span className="text-amber-500 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Crop Active</span>}
                                    </h2>
                                    <p className="text-xs text-muted">Original: {formatSize(file.originalSize)} • Result: {resizeWidth}x{resizeHeight}px</p>
                                </div>
                                <button
                                    onClick={() => isCropMode ? applyCrop() : setIsCropMode(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                                        isCropMode 
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' 
                                            : 'bg-surface border-border text-foreground hover:bg-surface-hover hover:border-primary/50'
                                    }`}
                                >
                                    <Scissors size={14} />
                                    {isCropMode ? 'Done Cropping' : 'Manual Crop'}
                                </button>
                            </div>

                            <div className="relative flex-1 bg-black/40 rounded-[2rem] border border-border/50 overflow-hidden flex items-center justify-center p-8 backdrop-blur-sm shadow-inner group/preview">
                                
                                {/* Resizing Frame / Preview Container */}
                                <div 
                                    className={`relative z-10 border-2 border-dashed border-primary/30 rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl bg-black/50 ${isCropMode ? 'opacity-30 blur-sm grayscale pointer-events-none' : ''}`}
                                    style={previewStyle}
                                >
                                    <img 
                                        src={cropPreviewUrl || file.originalBlobUrl!} 
                                        alt="Preview" 
                                        className="w-full h-full select-none"
                                        style={{ 
                                            objectFit: 'contain'
                                        }}
                                    />
                                    
                                    {/* Overlay Info */}
                                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                        Live Preview
                                    </div>
                                </div>

                                {/* Manual Crop Layer (Visible only in Crop Mode) */}
                                {isCropMode && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center p-8 animate-[fadeIn_0.3s_ease-out]">
                                        <div className="max-w-full max-h-full bg-background rounded-3xl p-6 shadow-2xl border border-white/10 ring-1 ring-black/50">
                                            <ReactCrop 
                                                crop={crop} 
                                                onChange={c => setCrop(c)} 
                                                onComplete={c => setCompletedCrop(c)}
                                                aspect={aspectRatio}
                                                className="max-h-[60vh]"
                                            >
                                                <img 
                                                    ref={imgRef}
                                                    src={file.originalBlobUrl!} 
                                                    alt="Crop view" 
                                                    onLoad={onImageLoad}
                                                    className="max-w-full max-h-[60vh] object-contain"
                                                />
                                            </ReactCrop>
                                            <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted">
                                                <span className="flex items-center gap-2">
                                                    <Move size={14} /> Drag handles to crop
                                                </span>
                                                <button onClick={applyCrop} className="text-primary hover:text-primary-hover flex items-center gap-1">
                                                    Apply Crop <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Hover Prompt */}
                                {!isCropMode && !isProcessing && file.status !== 'done' && (
                                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center gap-2 pointer-events-none">
                                        <div className="bg-primary/20 backdrop-blur-md border border-primary/30 text-primary px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 animate-bounce">
                                            Ready to Process
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Info */}
                            <GlassCard className="!p-4 bg-primary/5 border-primary/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        {isProcessing ? <RefreshCw className="animate-spin" /> : <AlertCircle size={24} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-foreground">
                                            {isProcessing ? "Enhancing your image pixels..." : isCropMode ? "Fine-tuning your focal point..." : "Interactive Preview Active"}
                                        </p>
                                        <p className="text-[10px] text-muted">Acknowledge: The live preview utilizes CSS logic to simulate resizing. The final download will be processed with industrial-grade algorithms.</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
