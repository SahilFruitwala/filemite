"use client";

import React, { useState, useRef } from 'react';

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
      className={`relative w-full max-w-2xl mx-auto h-80 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer
        ${isDragging 
          ? 'border-primary bg-primary/10 shadow-[0_0_50px_rgba(47,172,242,0.2)]' 
          : 'border-secondary bg-[#0a0e14]/50 hover:border-gray-500'
        }
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
        accept="image/png, image/jpeg, image/webp"
        multiple
      />

      {isCompressing ? (
        <div className="flex flex-col items-center animate-pulse">
           <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
           <p className="text-lg font-medium text-gray-300">Compressing your image...</p>
        </div>
      ) : (
        <>
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6 text-primary shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11L12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 9C3 6.17157 3 4.75736 3.87868 3.87868C4.75736 3 6.17157 3 9 3H15C17.8284 3 19.2426 3 20.1213 3.87868C21 4.75736 21 6.17157 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
          
            <h3 className="text-2xl font-bold text-white mb-2">Drag & drop images here</h3>
            <p className="text-gray-400 mb-8 text-center max-w-sm">
                or click to browse your computer. Supports JPEG, PNG, WebP. Max file size: 25MB
            </p>

            <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-[0_0_20px_rgba(47,172,242,0.4)] hover:shadow-[0_0_30px_rgba(47,172,242,0.6)] cursor-pointer">
                Select Files
            </button>
            <div className='flex gap-4 mt-8'>
                <div className='bg-[#1a202c] px-3 py-1 rounded-md text-xs text-gray-400 flex items-center gap-2'>
                   <span className="w-1 h-3 bg-gray-600 rounded-full"></span> JPEG
                </div>
                <div className='bg-[#1a202c] px-3 py-1 rounded-md text-xs text-gray-400 flex items-center gap-2'>
                   <span className="w-1 h-3 bg-gray-600 rounded-full"></span> PNG
                </div>
                 <div className='bg-[#1a202c] px-3 py-1 rounded-md text-xs text-gray-400 flex items-center gap-2'>
                   <span className="w-1 h-3 bg-gray-600 rounded-full"></span> WEBP
                </div>
            </div>
        </>
      )}
    </div>
  );
}
