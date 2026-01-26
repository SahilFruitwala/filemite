"use client";

import React, { useState } from 'react';
import ImageCompare from './ImageCompare';
import { CompressedFile } from '@/types';

interface ResultCardProps {
    file: CompressedFile;
    type: 'compress' | 'convert' | 'watermark';
    onDownload: () => void;
}

export default function ResultCard({ file, type, onDownload }: ResultCardProps) {
    const [isComparing, setIsComparing] = useState(false);

    // Determine what to show based on type and status
    // Common Logic:
    // - Original Blob: file.originalBlobUrl
    // - Result Blob: 
    //   - Compress: file.clientStats?.blobUrl (using client for now as main result)
    //   - Convert: file.blobUrl
    //   - Watermark: file.serverStats?.blobUrl (watermark is server only)
    
    let resultBlobUrl = '';
    let resultSize = 0;
    let resultTime = 0;
    let status = 'pending';
    let rightLabel = 'Result';

    switch (type) {
        case 'compress':
            resultBlobUrl = file.clientStats?.blobUrl || '';
            resultSize = file.clientStats?.size || 0;
            resultTime = file.clientStats?.time || 0;
            status = file.clientStatus || 'pending';
            rightLabel = 'Compressed';
            break;
        case 'convert':
            resultBlobUrl = file.blobUrl || '';
            resultSize = file.compressedSize || 0;
            // Convert page doesn't track time in same way in struct, strictly speaking?
            // Page logic: setFiles... compressedSize: blob.size
            status = file.status;
            rightLabel = 'Converted';
            break;
        case 'watermark':
            resultBlobUrl = file.serverStats?.blobUrl || '';
            resultSize = file.serverStats?.size || 0;
            resultTime = file.serverStats?.time || 0;
            status = file.serverStatus || 'pending';
            rightLabel = 'Watermarked';
            break;
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="bg-secondary border border-white/5 rounded-2xl p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-start gap-4 mb-4">
                {/* Thumbnail / Compare Toggle */}
                <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shrink-0 relative group">
                    {resultBlobUrl || file.originalBlobUrl ? (
                        <img 
                            src={resultBlobUrl || file.originalBlobUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => resultBlobUrl && setIsComparing(!isComparing)}
                        />
                    ) : (
                        <div className="animate-pulse w-full h-full bg-white/5"></div>
                    )}
                    
                    {/* Hover Overlay for Compare */}
                    {resultBlobUrl && (
                         <div 
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white scale-75">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate max-w-[200px] sm:max-w-xs">{file.originalName}</h3>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-xs mt-1">
                        {status === 'done' ? (
                            <>
                                <span className="text-gray-400">{formatSize(file.originalSize)}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
                                <span className="text-white font-bold">{formatSize(resultSize)}</span>
                                {type !== 'convert' && resultTime > 0 && <span className="bg-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">{resultTime.toFixed(0)}ms</span>}
                            </>
                        ) : status === 'processing' ? (
                            <span className="text-primary flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                            </span>
                         ) : status === 'error' ? (
                             <span className="text-red-400">Failed</span>
                         ) : (
                            <span className="text-gray-500">Pending...</span> 
                        )}
                    </div>
                </div>

                {/* Main Actions */}
                 {status === 'done' && (
                    <div className="flex flex-col gap-2 shrink-0">
                         <button 
                            onClick={onDownload}
                            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-primary/20"
                        >
                            Download
                        </button>
                        <button 
                            onClick={() => setIsComparing(!isComparing)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isComparing ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/20 hover:text-white'}`}
                        >
                            {isComparing ? 'Close' : 'Compare'}
                        </button>
                    </div>
                )}
            </div>

            {/* Comparison View */}
            {isComparing && status === 'done' && resultBlobUrl && (
                <div className="mt-4 animate-[fadeIn_0.3s_ease-out] border-t border-white/5 pt-4">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50">
                        <ImageCompare 
                            original={file.originalBlobUrl || ''} 
                            compressed={resultBlobUrl}
                            leftLabel="Original"
                            rightLabel={rightLabel}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
