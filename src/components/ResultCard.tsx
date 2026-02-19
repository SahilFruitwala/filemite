import React, { useState } from "react";
import Image from "next/image";
import { Download, Check, Files, RefreshCw } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

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
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center p-6">
        {/* Preview Section */}
        <div className="space-y-6">
          <div className="relative aspect-square w-full bg-repeating-conic border border-border/50 rounded-2xl overflow-hidden group shadow-inner">
            <Image
              src={compressedUrl}
              alt="Compressed preview"
              fill
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur text-foreground text-xs font-medium px-2 py-1 rounded-md border border-border shadow-sm">
              {stats.timeTaken}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Success!</h3>
                <p className="text-muted-foreground text-sm border-l-2 border-primary pl-4">
                    {originalFile.name} successfully compressed.
                </p>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Original</p>
              <p className="text-lg font-bold text-foreground">{stats.originalSize}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">New Size</p>
              <p className="text-lg font-bold text-foreground">{stats.compressedSize}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Savings</p>
              <p className="text-lg font-bold text-foreground">{stats.reduction}</p>
            </div>
             <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Format</p>
              <p className="text-lg font-bold text-foreground uppercase">{outputFormat}</p>
            </div>
          </div>

            <div className="flex flex-col gap-3">
                <Button onClick={handleDownload} fullWidth size="lg" className="rounded-xl shadow-lg shadow-primary/20">
                    {downloaded ? (
                        <>
                        <Check size={20} className="mr-2" /> Downloaded
                        </>
                    ) : (
                        <>
                        <Download size={20} className="mr-2" /> Download Image
                        </>
                    )}
                </Button>
                
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleCopy} className="flex-1 rounded-xl">
                        {copied ? <Check size={18} className="mr-2" /> : <Files size={18} className="mr-2" />}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="outline" onClick={onReset} className="flex-1 rounded-xl border-dashed">
                        <RefreshCw size={18} className="mr-2" />
                        New
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </GlassCard>
  );
}
