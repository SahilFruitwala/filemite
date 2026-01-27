"use client";

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, FileWarning } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (files: File[]) => void;
  isCompressing: boolean;
}

export default function Dropzone({ onFileSelect, isCompressing }: DropzoneProps) {
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

  return (
    <div
      className={`relative w-full max-w-3xl mx-auto min-h-[320px] rounded-[2.5rem] border border-dashed transition-all duration-500 overflow-hidden flex flex-col items-center justify-center p-8 sm:p-12 group cursor-pointer
        ${isDragging 
          ? 'border-primary/50 bg-primary/10 shadow-[0_0_80px_rgba(47,172,242,0.15)] scale-[1.02]' 
          : 'border-border/60 bg-surface hover:bg-surface-hover hover:border-primary/30'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(47,172,242,0.1)_0,transparent_70%)] group-hover:scale-110 transition-transform duration-700"></div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp"
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
           <h3 className="text-xl font-bold text-white mb-2">Optimizing your images</h3>
           <p className="text-gray-400 text-sm max-w-[240px]">We're applying professional-grade compression logic...</p>
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
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    {isDragging ? 'Drop it here!' : 'Drop your images here'}
                </h3>
                <p className="text-muted mb-10 text-center max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
                    or <span className="text-primary font-semibold hover:underline">click to browse</span> from your device.
                    Supports JPEG, PNG, and WebP up to 25MB.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                    {['JPEG', 'PNG', 'WEBP'].map((format) => (
                        <div key={format} className='px-4 py-1.5 rounded-full bg-surface border border-border text-[10px] sm:text-xs font-bold text-muted tracking-wider flex items-center gap-2 group-hover:border-border transition-colors'>
                            <div className="w-1.5 h-1.5 rounded-full bg-subtle"></div>
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
