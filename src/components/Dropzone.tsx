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
      className={`relative group cursor-pointer transition-all duration-300 w-full max-w-2xl mx-auto
        min-h-[300px] flex flex-col items-center justify-center text-center p-10
        border-2 border-dashed rounded-3xl
        ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }
        ${isCompressing ? "opacity-50 pointer-events-none" : ""}
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
        <div className="flex flex-col items-center text-center space-y-4">
           <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
           </div>
           <div>
               <h3 className="text-xl font-semibold text-foreground">Processing</h3>
               <p className="text-muted-foreground text-sm">Optimizing your images...</p>
           </div>
        </div>
      ) : (
        <>
            <div className={`mb-6 p-5 rounded-2xl bg-background shadow-sm border border-border transition-transform duration-300 ${isDragging ? 'scale-110 rotate-3' : 'group-hover:scale-110 group-hover:-rotate-3'}`}>
                {isDragging ? (
                    <Upload className="w-10 h-10 text-primary" />
                ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
            </div>
          
            <div className="space-y-2 relative z-10 max-w-sm">
                <h3 className="text-2xl font-bold text-foreground">
                    {isDragging ? 'Drop it like it\'s hot!' : message}
                </h3>
                <p className="text-muted-foreground text-base">
                    or <span className="text-primary font-medium hover:underline">click to browse</span>
                </p>
                <p className="text-xs text-muted-foreground pt-4">
                    Supports {displayFormats.join(', ')} up to 25MB.
                </p>
            </div>
        </>
      )}
    </div>
  );
}

