import React, { useState } from "react";
import Image from "next/image";
import { Download, Check, Files, RefreshCw } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import BrutalButton from "@/components/ui/BrutalButton";

interface ResultCardProps {
  originalFile: File;
  compressedUrl: string;
  compressedSize: number;
  outputFormat: string;
  stats: {
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
    reduction: string;
    timeTaken: string;
  };
  onReset: () => void;
}

export default function ResultCard({
  originalFile,
  compressedUrl,
  compressedSize,
  outputFormat,
  stats,
  onReset,
}: ResultCardProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = compressedUrl;
    a.download = `min_${originalFile.name.replace(/\.[^/.]+$/, "")}.${outputFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleCopy = async () => {
    try {
      const response = await fetch(compressedUrl);
      const blob = await response.blob();
      const item = new ClipboardItem({
        [blob.type]: blob
      });
      await navigator.clipboard.write([item]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  return (
    <GlassCard className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700" hoverEffect={false}>
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Preview Section */}
        <div className="space-y-6">
          <div className="relative aspect-square w-full bg-repeating-conic border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)] overflow-hidden group">
            <Image
              src={compressedUrl}
              alt="Compressed preview"
              fill
              className="object-contain p-4"
              unoptimized
            />
            <div className="absolute top-4 left-4 bg-primary text-white text-xs font-black uppercase px-2 py-1 border-2 border-border">
              Processing: {stats.timeTaken}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="space-y-8">
            <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Success!</h3>
                <p className="text-muted font-mono text-sm border-l-4 border-primary pl-4">
                    {originalFile.name} successfully compressed.
                </p>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)]">
              <p className="text-xs font-black uppercase text-muted mb-1">Original</p>
              <p className="text-xl font-black">{stats.originalSize}</p>
            </div>
            <div className="p-4 bg-primary text-white border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)]">
              <p className="text-xs font-black uppercase text-white/80 mb-1">New Size</p>
              <p className="text-xl font-black">{stats.compressedSize}</p>
            </div>
            <div className="p-4 bg-surface border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)]">
              <p className="text-xs font-black uppercase text-muted mb-1">Savings</p>
              <p className="text-xl font-black text-primary">{stats.reduction}</p>
            </div>
             <div className="p-4 bg-surface border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)]">
              <p className="text-xs font-black uppercase text-muted mb-1">Format</p>
              <p className="text-xl font-black uppercase">{outputFormat}</p>
            </div>
          </div>

            <div className="flex flex-col gap-3">
                <BrutalButton onClick={handleDownload} fullWidth size="lg">
                    {downloaded ? (
                        <>
                        <Check size={20} className="mr-2" /> Downloaded
                        </>
                    ) : (
                        <>
                        <Download size={20} className="mr-2" /> Download Image
                        </>
                    )}
                </BrutalButton>
                
                <div className="flex gap-3">
                    <BrutalButton variant="secondary" onClick={handleCopy} className="flex-1">
                        {copied ? <Check size={18} className="mr-2" /> : <Files size={18} className="mr-2" />}
                        {copied ? "Copied" : "Copy"}
                    </BrutalButton>
                    <BrutalButton variant="outline" onClick={onReset} className="flex-1">
                        <RefreshCw size={18} className="mr-2" />
                        New
                    </BrutalButton>
                </div>
            </div>
        </div>
      </div>
    </GlassCard>
  );
}
