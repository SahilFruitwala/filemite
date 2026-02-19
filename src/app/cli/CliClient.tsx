"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import { 
  Terminal, 
  Zap, 
  Shield, 
  Repeat, 
  Settings, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Cpu, 
  Trash2,
  Package,
  Github
} from 'lucide-react';

const CodeBlock = ({ code, label }: { code: string, label?: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {label && (
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
          {label}
        </div>
      )}
      <div className="bg-black/40 backdrop-blur-md border border-border/50 rounded-xl p-3 sm:p-4 font-mono text-xs sm:text-sm group-hover:border-primary/30 transition-colors flex items-center justify-between gap-3 sm:gap-4 overflow-hidden w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
        <code className="text-secondary-foreground overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 min-w-0">
          <span className="text-primary mr-2 font-bold select-none">$</span>
          {code}
        </code>
        <button 
          onClick={copyToClipboard}
          className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary active:scale-95"
          title="Copy to clipboard"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <GlassCard className="p-6 h-full border-primary/5 hover:border-primary/20 transition-all active:scale-[0.98]">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform duration-500">
      {icon}
    </div>
    <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </GlassCard>
);

export default function CliClient() {
  const installMethods = [
    {
      id: 'npm',
      label: 'NPM / Bun / Yarn',
      description: 'Install globally to your system',
      code: 'npm install -g micropng-cli'
    },
    {
      id: 'brew',
      label: 'Homebrew',
      description: 'MacOS & Linux package manager',
      code: 'brew install SahilFruitwala/tap/micropng-cli'
    },
    {
      id: 'npx',
      label: 'Run instantly (NPX)',
      description: 'Zero installation required',
      code: 'npx micropng-cli --help'
    }
  ];

  const features = [
    {
      icon: <Zap size={24} />,
      title: "Blazing Fast",
      description: "Parallel processing with smart concurrency control to saturate your CPU without crashing."
    },
    {
      icon: <Repeat size={24} />,
      title: "Deeply Recursive",
      description: "Scans folders and subfolders, maintaining your directory structure perfectly."
    },
    {
      icon: <Shield size={24} />,
      title: "Safety First",
      description: "Atomic overwrites: original files are only replaced if the compressed version is actually smaller."
    },
    {
      icon: <Layers size={24} />,
      title: "Universal Formats",
      description: "Full support for JPEG, PNG, WebP, and AVIF conversion and compression."
    },
    {
      icon: <Cpu size={24} />,
      title: "Local-First",
      description: "No data ever leaves your machine. Your privacy and speed are guaranteed."
    },
    {
      icon: <Trash2 size={24} />,
      title: "Metadata Control",
      description: "Choose whether to strip or keep EXIF information (GPS, camera settings, etc.)."
    }
  ];

  const examples = [
    {
      label: "Basic Compression",
      code: "micropng-cli input.png --output optimized.png",
      desc: "Compress a single file with default settings."
    },
    {
      label: "Bulk Folder Processing",
      code: "micropng-cli ./assets --output ./dist --recursive",
      desc: "Optimize an entire directory maintaining structure."
    },
    {
      label: "In-Place Project Optimization",
      code: "micropng-cli ./src --recursive --replace --quality 85",
      desc: "The professional way: replace originals safely."
    }
  ];

  const options = [
    { opt: "--output", alias: "-o", desc: "Target directory or file path" },
    { opt: "--recursive", alias: "-r", desc: "Deep scan subfolders" },
    { opt: "--replace", alias: "", desc: "Safe atomic overwrite" },
    { opt: "--quality", alias: "-q", desc: "Compression quality (1-100)" },
    { opt: "--format", alias: "-f", desc: "Output format (webp, jpeg, avif, png)" },
    { opt: "--concurrency", alias: "-c", desc: "Max simultaneous tasks" },
    { opt: "--ignore", alias: "-i", desc: "Glob patterns to skip" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-24 max-w-6xl overflow-hidden">
        <section aria-labelledby="cli-header" className="mb-20">
          <PageHeader 
            title={<>MicroPng <span className="text-primary">CLI.</span></>}
            description="Professional image compression for your terminal. Fast, local, and recursive."
          />
          
          <div className="flex justify-center -mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
             <div className="px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
               <Package size={14} />
               Now on NPM & Homebrew
             </div>
          </div>
        </section>

        <section aria-labelledby="cli-hero" className="grid lg:grid-cols-2 gap-12 items-center mb-32">
          <div className="space-y-8">
            <h2 id="cli-hero" className="text-2xl sm:text-3xl font-bold tracking-tight">Powerful Features, <br className="hidden sm:block" /><span className="text-muted-foreground">Zero Compromise.</span></h2>
            <p className="text-muted-foreground leading-relaxed max-w-md">
              The MicroPng CLI brings professional-grade image optimization to your build pipelines and local development environment. Built for speed and reliability.
            </p>
            
            <div className="space-y-4">
              {installMethods.map((method) => (
                <CodeBlock key={method.id} code={method.code} label={method.label} />
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-20 -z-10 animate-pulse"></div>
            <GlassCard className="border-primary/10 bg-black/40 overflow-hidden" hoverEffect={false}>
              <div className="bg-white/5 px-4 py-3 flex items-center gap-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/50"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase flex items-center justify-center gap-1.5">
                    <Terminal size={10} />
                    micropng-cli
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-6 font-mono text-[10px] sm:text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-all sm:break-words">
                <div className="text-muted-foreground mb-2"># Processing 148 images recursively...</div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <span className="text-primary font-bold">➜</span>
                  <span className="text-emerald-400">SUCCESS</span>
                  <span className="text-white break-all">Optimized image-24.png</span>
                  <span className="text-muted-foreground whitespace-nowrap">Saved 42% (1.2 MB)</span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <span className="text-primary font-bold">➜</span>
                  <span className="text-emerald-400">SUCCESS</span>
                  <span className="text-white break-all">banner-large.webp</span>
                  <span className="text-muted-foreground whitespace-nowrap">Saved 68% (4.5 MB)</span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <span className="text-primary font-bold shrink-0">➜</span>
                  <span className="text-emerald-400 shrink-0">SUCCESS</span>
                  <span className="text-white break-all">logo-transparent.png</span>
                  <span className="text-muted-foreground shrink-0 whitespace-nowrap">Saved 12% (15 KB)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="text-primary font-bold mb-1 sm:col-span-2">Total Stats:</div>
                  <div className="text-white">Files Processed: 148</div>
                  <div className="text-white">Time Taken: 4.2s</div>
                  <div className="text-white sm:col-span-2">Total Space Saved: <span className="text-emerald-400 font-bold underline decoration-emerald-400/30 underline-offset-2">124.5 MB</span></div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        <section aria-labelledby="cli-features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 sm:mb-32">
          <h2 id="cli-features" className="sr-only">Key Features</h2>
          {features.map((feature, idx) => (
            <div key={idx} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
              <FeatureCard {...feature} />
            </div>
          ))}
        </section>

        <section aria-labelledby="cli-usage" className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-20 sm:mb-32">
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Terminal size={20} />
              </div>
              <h2 id="cli-usage" className="text-2xl font-bold tracking-tight">Usage Examples</h2>
            </div>
            <div className="grid gap-6">
              {examples.map((ex, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-sm font-semibold text-foreground/80 ml-1">{ex.desc}</p>
                  <CodeBlock code={ex.code} label={ex.label} />
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Settings size={20} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Available Options</h2>
            </div>
            
            <GlassCard className="p-0 border-orange-500/10 overflow-hidden" hoverEffect={false}>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[500px]">
                  <thead className="bg-secondary/50 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Option</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Alias</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {options.map((opt, idx) => (
                      <tr key={idx} className="hover:bg-accent/30 transition-colors group">
                        <td className="px-4 py-3 font-mono text-xs text-primary group-hover:underline decoration-primary/30 underline-offset-4">{opt.opt}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{opt.alias || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground group-hover:text-foreground">{opt.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 text-center">
              Run <code className="text-primary">micropng-cli --help</code> for full documentation
            </p>
          </div>
        </section>

        <section aria-labelledby="cli-cta">
          <GlassCard className="bg-gradient-to-br from-primary/10 via-background to-transparent border-primary/20 p-8 sm:p-12 text-center overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10 rounded-full"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 blur-[80px] -z-10 rounded-full"></div>
             
             <h2 id="cli-cta" className="text-3xl font-bold mb-4 tracking-tight">Ready to optimize?</h2>
             <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-medium">
               Install the CLI now and start optimizing your images with the same speed and privacy as the web application, but directly from your terminal.
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <a 
                 href="https://github.com/SahilFruitwala/micropng-cli" 
                 target="_blank"
                 className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
               >
                 <Github size={18} />
                 View Repository
               </a>
               <a 
                 href="https://www.npmjs.com/package/micropng-cli" 
                 target="_blank"
                 className="px-8 py-3 bg-secondary text-foreground rounded-xl font-bold text-sm border border-border/50 hover:bg-secondary/80 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
               >
                 <Download size={18} />
                 NPM Package
               </a>
             </div>
          </GlassCard>
        </section>
      </main>

      <Footer />
    </div>
  );
}
