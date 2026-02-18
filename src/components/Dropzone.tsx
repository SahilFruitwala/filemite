"use client";

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, FileWarning } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (files: File[]) => void;
  isCompressing: boolean;
  message?: string;
  accept?: string;
}

export default function Dropzone({ 
  onFileSelect, 
  isCompressing, 
  message = "Drop your images here", 
  accept = "image/png, image/jpeg, image/webp" 
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(Array.from(e.target.files));
    }
  };

  const displayFormats = accept.split(',').map(f => f.trim().split('/').pop()?.toUpperCase()).filter(Boolean);

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-300 w-full max-w-xl mx-auto
        min-h-[260px] flex flex-col items-center justify-center text-center p-10 sm:p-14
        border-4 ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border border-dashed hover:border-primary hover:bg-surface"
        }
        ${isCompressing ? "opacity-50 pointer-events-none" : ""}
        shadow-[8px_8px_0px_0px_var(--color-border)]
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept={accept}
        multiple
      />

      {isCompressing ? (
        <div className="flex flex-col items-center text-center">
           <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-primary/20 rounded-full animate-pulse"></div>
                </div>
           </div>
           <h3 className="text-xl font-bold text-foreground mb-2">Processing your files</h3>
           <p className="text-muted text-sm max-w-[240px]">We're handling your request with professional-grade logic...</p>
        </div>
      ) : (
        <>
            <div className={`mb-8 p-6 rounded-3xl bg-surface border border-border/50 shadow-xl transition-all duration-500 ${isDragging ? 'scale-110 -translate-y-2 bg-primary/20 border-primary/30' : 'group-hover:scale-110 group-hover:-translate-y-1 group-hover:bg-surface-hover'}`}>
                {isDragging ? (
                    <Upload className="w-10 h-10 text-primary animate-bounce" />
                ) : (
                    <ImageIcon className="w-10 h-10 text-muted group-hover:text-primary transition-colors" />
                )}
            </div>
          
            <div className="text-center relative z-10">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    {isDragging ? 'Drop it here!' : message}
                </h3>
                <p className="text-muted mb-10 text-center max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
                    or <span className="text-primary font-semibold hover:underline">click to browse</span> from your device.
                    Supports {displayFormats.join(', ')} up to 25MB.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                    {displayFormats.map((format) => (
                        <div key={format} className='px-4 py-1.5 rounded-full bg-accent border border-border text-[10px] sm:text-xs font-bold text-muted tracking-wider flex items-center gap-2 group-hover:border-border transition-colors'>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            {format}
                        </div>
                    ))}
                </div>
            </div>
        </>
      )}
    </div>
  );
}

