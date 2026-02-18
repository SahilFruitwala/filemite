"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Dropzone from '@/components/Dropzone';
import JSZip from 'jszip';

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256];
const MOBILE_SIZES = [180]; // Apple Touch Icon
const ICO_SIZES = [16, 32, 48];

export default function FaviconPage() {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedFiles, setGeneratedFiles] = useState<{ size: number, blob: Blob, url: string, type: 'web' | 'mobile' | 'ico' }[]>([]);
    const [icoBlob, setIcoBlob] = useState<Blob | null>(null);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setOriginalFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setGeneratedFiles([]);
            setIcoBlob(null);
        }
    };

    const generateFavicons = async () => {
        if (!originalFile) return;

        setIsGenerating(true);
        const newGeneratedFiles: { size: number, blob: Blob, url: string, type: 'web' | 'mobile' | 'ico' }[] = [];

        try {
            // 1. Generate PNGs for Web and Mobile in parallel
            const allPngSizes = Array.from(new Set([...FAVICON_SIZES, ...MOBILE_SIZES, ...ICO_SIZES]));
            const pngResults: Record<number, Blob> = {};

            const pngPromises = allPngSizes.map(async (size) => {
                const formData = new FormData();
                formData.append('file', originalFile);
                formData.append('width', size.toString());
                formData.append('height', size.toString());
                formData.append('fit', 'contain');
                formData.append('format', 'png');
                formData.append('level', 'lossless');
                formData.append('speed', 'fast');

                const response = await fetch('/api/compress', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error(`Failed to generate ${size}x${size} png`);

                const blob = await response.blob();
                pngResults[size] = blob;
                return { size, blob };
            });

            const results = await Promise.all(pngPromises);

            results.forEach(({ size, blob }) => {
                const url = URL.createObjectURL(blob);
                if (FAVICON_SIZES.includes(size)) {
                    newGeneratedFiles.push({ size, blob, url, type: 'web' });
                }
                if (MOBILE_SIZES.includes(size)) {
                    newGeneratedFiles.push({ size, blob, url, type: 'mobile' });
                }
            });

            // 2. Generate ICO file using specific sizes
            const icoFormData = new FormData();
            ICO_SIZES.forEach(size => {
                icoFormData.append('files', pngResults[size], `icon-${size}.png`);
            });

            const icoResponse = await fetch('/api/favicon', {
                method: 'POST',
                body: icoFormData,
            });

            if (icoResponse.ok) {
                const blob = await icoResponse.blob();
                setIcoBlob(blob);
            }

            setGeneratedFiles(newGeneratedFiles);
        } catch (error) {
            console.error(error);
            alert("Error generating favicons. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadAll = async () => {
        const zip = new JSZip();
        
        // Add PNGs
        generatedFiles.forEach(file => {
            const name = file.type === 'mobile' ? `apple-touch-icon.png` : `favicon-${file.size}x${file.size}.png`;
            zip.file(name, file.blob);
        });

        // Add ICO
        if (icoBlob) {
            zip.file("favicon.ico", icoBlob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "favicons.zip";
        link.click();
    };

    const handleReset = () => {
        setOriginalFile(null);
        setPreviewUrl(null);
        setGeneratedFiles([]);
        setIcoBlob(null);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary opacity-[0.03] blur-[150px] rounded-full pointer-events-none z-[-1]"></div>

            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-foreground">
                        Favicon Generator <br />
                        <span className="text-muted">for all devices.</span>
                    </h1>
                    <p className="text-muted max-w-2xl mx-auto text-lg">
                        Generate web, mobile, and legacy .ico icons from a single upload.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    {!originalFile ? (
                        <Dropzone onFileSelect={handleFileSelect} isCompressing={isGenerating} />
                    ) : (
                        <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                            <div className="bg-secondary border border-border rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-48 h-48 bg-black rounded-2xl overflow-hidden border border-border shrink-0 shadow-2xl relative group">
                                    {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />}
                                    <button 
                                        onClick={handleReset}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-bold"
                                    >
                                        Change Image
                                    </button>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-foreground mb-2">{originalFile.name}</h3>
                                    <p className="text-muted mb-6 font-medium">Now generates Apple Touch Icon and favicon.ico</p>
                                    <button
                                        onClick={generateFavicons}
                                        disabled={isGenerating || generatedFiles.length > 0}
                                        className={`bg-primary hover:bg-primary-hover text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-3 mx-auto md:mx-0 ${
                                            (isGenerating || generatedFiles.length > 0) ? 'opacity-50 cursor-not-allowed grayscale' : ''
                                        }`}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                                Generating Assets...
                                            </>
                                        ) : generatedFiles.length > 0 ? (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                Ready for Download
                                            </>
                                        ) : (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
                                                Generate Package
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {generatedFiles.length > 0 && (
                                <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-2xl font-bold text-foreground">Generated Assets</h2>
                                        <button 
                                            onClick={downloadAll}
                                            className="bg-success text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-success/20 hover:bg-success/90"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            Download All (ZIP)
                                        </button>
                                    </div>

                                    {/* Web Category */}
                                    <section>
                                        <h3 className="text-muted text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <span className="w-8 h-[1px] bg-border"></span> Standard Web Icons
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                                            {generatedFiles.filter(f => f.type === 'web').map((file) => (
                                                <div key={file.size} className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center gap-3 transition-colors hover:border-primary/50 group">
                                                    <div className="w-12 h-12 flex items-center justify-center bg-black rounded-lg border border-border overflow-hidden">
                                                        <img src={file.url} alt={`${file.size}x${file.size}`} className="max-w-full max-h-full" />
                                                    </div>
                                                    <span className="text-xs font-mono text-muted">{file.size}x{file.size}</span>
                                                    <a 
                                                        href={file.url} 
                                                        download={`favicon-${file.size}x${file.size}.png`}
                                                        className="p-1.5 text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Special Assets: ICO and Mobile */}
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <section>
                                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <span className="w-8 h-[1px] bg-white/10"></span> Mobile (iOS)
                                            </h3>
                                            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-6">
                                                {generatedFiles.filter(f => f.type === 'mobile').map((file) => (
                                                    <React.Fragment key={file.size}>
                                                        <div className="w-20 h-20 flex items-center justify-center bg-background rounded-xl border border-border overflow-hidden shadow-xl">
                                                            <img src={file.url} alt="Apple Touch Icon" className="w-full h-full" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-foreground font-bold">Apple Touch Icon</p>
                                                            <p className="text-muted text-sm">180x180 px • PNG</p>
                                                            <a 
                                                                href={file.url} 
                                                                download="apple-touch-icon.png"
                                                                className="text-primary text-xs font-bold mt-2 inline-block hover:underline"
                                                            >
                                                                Download PNG
                                                            </a>
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <span className="w-8 h-[1px] bg-white/10"></span> Legacy Support
                                            </h3>
                                            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-6">
                                                <div className="w-20 h-20 flex items-center justify-center bg-black rounded-xl border border-border shadow-xl">
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-bold">favicon.ico</p>
                                                    <p className="text-gray-500 text-sm">Multi-res (16, 32, 48) • ICO</p>
                                                    {icoBlob && (
                                                        <a 
                                                            href={URL.createObjectURL(icoBlob)} 
                                                            download="favicon.ico"
                                                            className="text-primary text-xs font-bold mt-2 inline-block hover:underline"
                                                        >
                                                            Download .ICO
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
