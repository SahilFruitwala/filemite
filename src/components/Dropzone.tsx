"use client";

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_BYTES, formatBytes } from '@/lib/constants';

interface DropzoneProps {
  onFileSelect: (files: File[]) => void;
  /** When true, shows a processing hint but still allows adding more files. */
  isCompressing?: boolean;
  message?: string;
  accept?: string;
  /** Smaller footprint for "add more" under results — better on mobile. */
  compact?: boolean;
}

const EXT_RE = /\.(jpe?g|png|webp|heic|heif)$/i;

function isAcceptedImage(file: File, accept: string): boolean {
  if (EXT_RE.test(file.name)) return true;
  if (!file.type) return false;
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase());
  return tokens.some((token) => {
    if (token.startsWith('.')) return file.name.toLowerCase().endsWith(token);
    if (token.endsWith('/*')) return file.type.startsWith(token.slice(0, -1));
    return file.type === token;
  });
}

export default function Dropzone({
  onFileSelect,
  isCompressing = false,
  message = 'Drop your images here',
  accept = ACCEPTED_IMAGE_TYPES,
  compact = false,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emitFiles = (list: FileList | File[]) => {
    const accepted = Array.from(list).filter((f) => isAcceptedImage(f, accept));
    if (accepted.length > 0) onFileSelect(accepted);
  };

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
    if (e.dataTransfer.files?.length) {
      emitFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      emitFiles(e.target.files);
    }
    // Reset so picking the same file again still fires change.
    e.target.value = '';
  };

  const displayFormats = ['PNG', 'JPEG', 'WebP', 'HEIC'];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={message}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative group cursor-pointer transition-all duration-300 w-full max-w-2xl mx-auto
        flex flex-col items-center justify-center text-center
        border-2 border-dashed rounded-2xl sm:rounded-3xl
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${compact ? 'min-h-[140px] sm:min-h-[160px] p-4 sm:p-6' : 'min-h-[220px] sm:min-h-[280px] p-5 sm:p-10'}
        ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
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
        accept={accept}
        multiple
      />

      <div
        className={`mb-4 sm:mb-6 rounded-2xl bg-background shadow-sm border border-border transition-transform duration-300 ${
          compact ? 'p-3' : 'p-4 sm:p-5'
        } ${isDragging ? 'scale-110 rotate-3' : 'group-hover:scale-105 group-hover:-rotate-2'}`}
      >
        {isDragging ? (
          <Upload className={`${compact ? 'w-7 h-7' : 'w-9 h-9 sm:w-10 sm:h-10'} text-primary`} />
        ) : (
          <ImageIcon
            className={`${compact ? 'w-7 h-7' : 'w-9 h-9 sm:w-10 sm:h-10'} text-muted-foreground group-hover:text-primary transition-colors`}
          />
        )}
      </div>

      <div className={`space-y-1.5 relative z-10 max-w-sm ${compact ? '' : 'space-y-2'}`}>
        <h3
          className={`font-bold text-foreground ${
            compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
          }`}
        >
          {isDragging ? "Drop it — we'll take it from here" : message}
        </h3>
        <p className={`text-muted-foreground ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>
          or <span className="text-primary font-medium">tap to browse</span>
        </p>
        <p className="text-xs text-muted-foreground pt-2 sm:pt-3">
          {displayFormats.join(', ')} · up to {formatBytes(MAX_FILE_BYTES)} each
          {isCompressing ? ' · compressing in background…' : ''}
        </p>
      </div>
    </div>
  );
}
