"use client";

import React, { useState, useRef, useEffect } from "react";
import Dropzone from "@/components/Dropzone";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ColorThief from "colorthief";
import BackgroundGlow from "@/components/ui/BackgroundGlow";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";

export default function PalettePage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      setColors([]); // Reset colors
    }
  };

  const extractColors = () => {
    if (!imgRef.current) return;
    
    setIsExtracting(true);
    const colorThief = new ColorThief();
    
    // Ensure image is loaded
    if (imgRef.current.complete) {
      processExtraction();
    } else {
      imgRef.current.addEventListener('load', processExtraction);
    }

    function processExtraction() {
        try {
            if (!imgRef.current) return;
            // Get 5 dominant colors
            const palette = colorThief.getPalette(imgRef.current, 5);
            // Convert to Hex
            const hexColors = palette.map((rgb: number[]) => rgbToHex(rgb[0], rgb[1], rgb[2]));
            setColors(hexColors);
        } catch (error) {
            console.error("Error extracting colors:", error);
        } finally {
            setIsExtracting(false);
        }
    }
  };

  // Helper to convert RGB to Hex
  const rgbToHex = (r: number, g: number, b: number) =>
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("");

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopyFeedback(color);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-center selection:bg-primary/30">
      <BackgroundGlow color="blue" />
      <Navbar />
      
      <main className="container mx-auto px-6 pt-32 pb-20">
        <PageHeader 
            title={<>Extract Color Palette</>}
            description="Upload an image to instantly generate a color palette based on its dominant colors. Perfect for designers."
            className="md:!mb-16"
        />

        {!uploadedImage ? (
          <Dropzone onFileSelect={handleFileSelect} isCompressing={false} />
        ) : (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-700">
             
             <div className="grid md:grid-cols-2 gap-12 items-start">
                
                {/* Image Preview */}
                <GlassCard className="p-0 border-border shadow-2xl bg-transparent">
                   <img 
                      ref={imgRef}
                      src={uploadedImage} 
                      alt="Uploaded" 
                      className="w-full h-auto object-contain max-h-[500px]"
                      onLoad={extractColors}
                      crossOrigin="anonymous" 
                   />
                   <button 
                     onClick={() => {
                        setUploadedImage(null);
                        setColors([]);
                     }}
                     className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                     title="Remove image"
                   >
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                   </button>
                </GlassCard>

                {/* Palette Display */}
                <div>
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-8 bg-primary rounded-full"></span>
                        Dominant Colors
                    </h3>
                    
                    {colors.length === 0 && isExtracting && (
                         <div className="flex gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-20 w-full rounded-xl bg-surface animate-pulse"></div>
                            ))}
                         </div>
                    )}

                    <div className="space-y-4">
                        {colors.map((color, index) => (
                            <div 
                                key={index}
                                onClick={() => copyToClipboard(color)}
                                className="group flex items-center justify-between p-4 rounded-xl bg-surface border border-border hover:border-primary/20 hover:bg-surface-hover transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="w-16 h-16 rounded-lg shadow-lg border border-border transition-transform group-hover:scale-105" 
                                        style={{ backgroundColor: color }}
                                    ></div>
                                    <div>
                                        <p className="text-xl font-mono font-bold tracking-wider">{color}</p>
                                        <p className="text-sm text-gray-500">HEX</p>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${copyFeedback === color ? 'bg-green-500/20 text-green-400' : 'bg-surface text-gray-300'}`}>
                                        {copyFeedback === color ? 'Copied!' : 'Copy'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {colors.length > 0 && (
                        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-200">
                            <strong>Tip:</strong> Click on any color row to copy the HEX code to your clipboard.
                        </div>
                    )}
                </div>
             </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
