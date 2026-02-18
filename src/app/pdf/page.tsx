"use client";

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

// Set worker path for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

type Tab = 'image-to-pdf' | 'pdf-to-image';

interface ProcessedFile {
    id: string;
    name: string;
    url: string;
    size: number;
    thumbnail?: string;
}

export default function PDFPage() {
    const [tab, setTab] = useState<Tab>('image-to-pdf');
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ProcessedFile[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<ProcessedFile | null>(null);

    const handleFilesSelect = (selectedFiles: File[]) => {
        setFiles(prev => [...prev, ...selectedFiles]);
        setError(null);
    };

    const handleReset = () => {
        setFiles([]);
        setResults([]);
        setError(null);
    };

    const generateThumbnail = async (pdfData: Uint8Array): Promise<string | undefined> => {
        try {
            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) {
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                return canvas.toDataURL('image/jpeg', 0.8);
            }
        } catch (e) {
            console.error('Thumbnail error:', e);
        }
        return undefined;
    };

    const imageToPdf = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setError(null);
        try {
            const pdfDoc = await PDFDocument.create();
            for (const file of files) {
                const imageBytes = await file.arrayBuffer();
                let image;
                if (file.type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                } else if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    await new Promise(resolve => img.onload = resolve);
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);
                    const jpegBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                    if (jpegBlob) {
                        image = await pdfDoc.embedJpg(await jpegBlob.arrayBuffer());
                    } else {
                        continue;
                    }
                }

                if (image) {
                    const page = pdfDoc.addPage([image.width, image.height]);
                    page.drawImage(image, {
                        x: 0,
                        y: 0,
                        width: image.width,
                        height: image.height,
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const thumb = await generateThumbnail(pdfBytes);

            setResults([{
                id: Math.random().toString(36).substring(2),
                name: 'micropng-merged.pdf',
                url: url,
                size: blob.size,
                thumbnail: thumb
            }]);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error creating PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const pdfToImage = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setError(null);
        try {
            const newResults: ProcessedFile[] = [];
            for (const file of files) {
                if (file.type !== 'application/pdf') continue;

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        const dataUrl = canvas.toDataURL('image/png');
                        const res = await fetch(dataUrl);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        newResults.push({
                            id: Math.random().toString(36).substring(2),
                            name: `${file.name.replace('.pdf', '')}-page-${i}.png`,
                            url: url,
                            size: blob.size,
                            thumbnail: dataUrl
                        });
                    }
                }
            }
            setResults(newResults);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error extracting images from PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundGlow color="primary" />
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <PageHeader 
                    title={<>PDF Tools <br /> <span className="text-muted">Convert between Images and PDF.</span></>}
                />

                <div className="max-w-xl mx-auto mb-12">
                    <div className="flex bg-surface/50 backdrop-blur-sm p-1 rounded-2xl border border-border/50 mb-8">
                        <button 
                            onClick={() => { setTab('image-to-pdf'); handleReset(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${tab === 'image-to-pdf' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:text-foreground'}`}
                        >
                            Images to PDF
                        </button>
                        <button 
                            onClick={() => { setTab('pdf-to-image'); handleReset(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${tab === 'pdf-to-image' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:text-foreground'}`}
                        >
                            PDF to Images
                        </button>
                    </div>

                    <GlassCard>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-6">
                                <h3 className="text-foreground font-medium flex items-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    {tab === 'image-to-pdf' ? 'Add Images' : 'Add PDF'}
                                </h3>
                                {files.length > 0 && (
                                    <button 
                                        onClick={handleReset}
                                        className="text-xs text-muted hover:text-destructive transition-colors underline underline-offset-4"
                                    >
                                        Clear Files
                                    </button>
                                )}
                            </div>

                            <Dropzone 
                                onFileSelect={handleFilesSelect} 
                                isCompressing={isProcessing}
                                accept={tab === 'image-to-pdf' ? 'image/png, image/jpeg, image/webp' : 'application/pdf'}
                                message={tab === 'image-to-pdf' ? "Drop your images here" : "Drop your PDF here"}
                            />

                            {files.length > 0 && !isProcessing && results.length === 0 && (
                                <div className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
                                    <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
                                        <p className="text-xs text-muted mb-2 uppercase tracking-wider font-semibold">Selected Files ({files.length})</p>
                                        <div className="max-h-40 overflow-y-auto space-y-2">
                                            {files.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm py-1">
                                                    <span className="truncate text-foreground/80 max-w-[70%]">{f.name}</span>
                                                    <span className="text-xs text-muted">{formatSize(f.size)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={tab === 'image-to-pdf' ? imageToPdf : pdfToImage}
                                        className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        {tab === 'image-to-pdf' ? 'Create PDF' : 'Extract Images'}
                                    </button>
                                </div>
                            )}

                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-sm text-muted font-medium">Processing your files...</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {error}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {results.length > 0 && (
                    <div className="max-w-4xl mx-auto animate-[fadeInUp_0.5s_ease-out]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-foreground">Generated Results</h2>
                            <button onClick={handleReset} className="text-sm text-muted hover:text-foreground underline underline-offset-4">Reset</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.map((res) => (
                                <div key={res.id} className="bg-surface/50 backdrop-blur-md border border-border p-4 rounded-2xl flex items-center justify-between group hover:border-primary/50 transition-all shadow-sm hover:shadow-primary/5">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div 
                                            className="w-16 h-16 rounded-xl bg-background flex items-center justify-center text-primary shrink-0 overflow-hidden border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => setPreviewFile(res)}
                                        >
                                            {res.thumbnail ? (
                                                <img src={res.thumbnail} alt="Thumbnail" className="w-full h-full object-contain bg-black/5" />
                                            ) : (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M9 19h6"/></svg>
                                            )}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span 
                                                className="text-sm font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => setPreviewFile(res)}
                                            >
                                                {res.name}
                                            </span>
                                            <span className="text-xs text-muted">{formatSize(res.size)}</span>
                                        </div>
                                    </div>
                                    <a 
                                        href={res.url} 
                                        download={res.name}
                                        className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 md:p-8 animate-[fadeIn_0.2s_ease-out]">
                    <div 
                        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
                        onClick={() => setPreviewFile(null)}
                    ></div>
                    <div className="relative bg-surface border border-border rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold text-foreground truncate">{previewFile.name}</h2>
                                <p className="text-muted text-sm">{formatSize(previewFile.size)}</p>
                            </div>
                            <button 
                                onClick={() => setPreviewFile(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 bg-black/5 flex items-center justify-center">
                            {previewFile.name.endsWith('.pdf') ? (
                                <iframe 
                                    src={`${previewFile.url}#toolbar=0`} 
                                    className="w-full h-full min-h-[500px] border-none rounded-xl"
                                    title="PDF Preview"
                                />
                            ) : (
                                <img 
                                    src={previewFile.url} 
                                    alt="Preview" 
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg" 
                                />
                            )}
                        </div>

                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <a 
                                href={previewFile.url} 
                                download={previewFile.name}
                                className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Download File
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

