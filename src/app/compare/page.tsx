import Link from "next/link";
import { Check, Shield, Zap, Infinity, Upload, Info, ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import ImageCompare from "@/components/ImageCompare";

export const metadata: Metadata = {
  title: "MicroPng vs TinyPNG - Why Local Compression is Better",
  description:
    "Compare MicroPng with TinyPNG. Discover why local-first image compression offers better privacy, efficiency, and flexibility compared to traditional cloud-based alternatives.",
  openGraph: {
    title: "MicroPng vs TinyPNG - The Privacy-First Alternative",
    description:
      "Stop uploading your images to the cloud. MicroPng offers secure, instant, and high-capacity compression directly in your browser.",
  },
};

export default function ComparePage() {
  return (
    <main className="min-h-screen pt-24 pb-12 px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16 space-y-4 relative">
        <Link href="/" className="absolute left-0 top-0 inline-flex items-center gap-2 text-muted hover:text-foreground transition-colors md:absolute md:left-0 md:top-2">
            <ArrowLeft size={20} />
            <span className="hidden md:inline">Back to App</span>
        </Link>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20 mt-12 md:mt-0">
          <Shield size={14} />
          <span>Transparency & Privacy First</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted">
          MicroPng vs TinyPNG
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          Honest comparison between local-first processing and traditional cloud compression.
        </p>
      </div>

      {/* Feature Highlight Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-20">
        <div className="p-6 rounded-2xl bg-surface border border-border backdrop-blur-sm hover:bg-surface-hover transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
            <Shield size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">Local-First Privacy</h3>
          <p className="text-muted leading-relaxed text-sm">
            We prioritize local browser processing for desktop compression. When server processing is required (Mobile/Scrubbing), images are processed in volatile RAM and immediately discarded. **We never store your data.**
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-surface border border-border backdrop-blur-sm hover:bg-surface-hover transition-colors">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
            <Check size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">Professional Quality</h3>
          <p className="text-muted leading-relaxed text-sm">
            TinyPNG's free tier has strict file size and count limits. MicroPng provides a superior, high-capacity experience designed for creators who need professional-grade optimization without the artificial friction.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-surface border border-border backdrop-blur-sm hover:bg-surface-hover transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
            <Zap size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">Hybrid Speed</h3>
          <p className="text-muted leading-relaxed text-sm">
            On desktop, compression is instant (0ms upload). On mobile, we use high-performance server clusters to handle heavy computation that would otherwise drain your battery.
          </p>
        </div>
      </div>

      {/* Interactive Compression Demo */}
      <div className="mb-20">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Quality You Can Trust</h2>
            <p className="text-muted max-w-2xl mx-auto">
                Drag the slider to compare. Our intelligent compression algorithms reduce file size significantly while maintaining pixel-perfect quality.
            </p>
        </div>
        <div className="bg-background/50 border border-border rounded-2xl p-4 backdrop-blur-md max-w-4xl mx-auto">
             <ImageCompare 
                original="/test-image.jpg" 
                compressed="/test-image.jpg" 
                leftLabel="Original (7.1 MB)"
                rightLabel="MicroPng (~3.2 MB)" 
             />
             <div className="text-center mt-4 text-xs text-muted">
                * Note: This is a simulation using the sample image. Actual compression results depend on image complexity.
             </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-background/50 border border-border rounded-3xl overflow-hidden mb-8 backdrop-blur-md">
        <div className="grid grid-cols-3 p-6 border-b border-border bg-surface">
          <div className="text-lg font-semibold text-muted">Feature</div>
          <div className="text-xl font-bold text-center text-primary">MicroPng</div>
          <div className="text-xl font-bold text-center text-subtle">TinyPNG</div>
        </div>
        
        <ComparisonRow 
          feature="Primary Processing"
          micro="Local Browser (Zero Upload)"
          tiny="Always Cloud Upload"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Data Persistence"
          micro="Never Stored (In-Memory Only)"
          tiny="Stored on Server (Temporary)"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Batch Processing"
          micro="High Capacity"
          tiny="20 Images Max"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Max File Size"
          micro="Up to 25MB+"
          tiny="5MB Limit"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Mobile Experience"
          micro="Optimized (Hybrid Mode)"
          tiny="Mobile-ready via Upload"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Pricing"
          micro="Free / Open Source*"
          tiny="Paid after 20 images"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Self-Hostable"
          micro="Yes (Run it yourself)"
          tiny="No (SaaS only)"
          isBetter={true}
        />
        <ComparisonRow 
          feature="Format Support"
          micro="PNG, JPEG, WebP, ICO"
          tiny="PNG, JPEG, WebP"
          isBetter={true}
        />
      </div>

      {/* Detailed Technical Note */}
      <div className="max-w-4xl mx-auto mb-20 space-y-4">
        <div className="px-6 py-6 rounded-2xl bg-surface border border-border flex gap-4 items-start">
            <Info size={24} className="text-primary shrink-0 mt-1" />
            <div className="space-y-3">
                <h4 className="text-lg font-semibold text-foreground">Why the Hybrid Model?</h4>
                <p className="text-sm text-muted leading-relaxed">
                    Unlike traditional tools that force you to upload every byte, MicroPng uses a <strong>Local-First architecture</strong>. For most desktop tasks, your image stays on your machine.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                    However, some tasks (like heavy watermarking or mobile processing) require significant memory (up to 4x the file size in RAM). To protect your battery and device performance, we gracefully switch to high-speed server-side processing—but we maintain our privacy promise: <strong>nothing is ever written to a disk.</strong>
                </p>
            </div>
        </div>

        {/* Transparency Note */}
        <div className="px-6 py-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-4 items-start">
            <div className="shrink-0 mt-1 text-blue-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            </div>
            <div className="space-y-3">
                <h4 className="text-lg font-semibold text-foreground">Community Supported & Open Source</h4>
                <p className="text-sm text-muted leading-relaxed">
                    * MicroPng is a free service hosted by the community. We are committed to keeping it free as long as we can sustain the hosting costs.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                    Concerned about longevity or privacy? <strong>You don't have to rely on us.</strong> MicroPng is 100% Open Source. You can clone the repository and run your own private instance locally.
                </p>
                <a href="https://github.com/SahilFruitwala/MicroPng" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    View on GitHub <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                </a>
            </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center bg-gradient-to-b from-surface to-transparent p-12 rounded-3xl border border-border">
        <h2 className="text-3xl font-bold mb-6">Ready to compress without limits?</h2>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-primary/20 hover:scale-105"
        >
          <Upload size={20} />
          Start Compressing Now
        </Link>
        <p className="mt-4 text-sm text-subtle">
          No sign-up required. Completely free.
        </p>
      </div>
    </main>
  );
}

function ComparisonRow({ feature, micro, tiny, isBetter }: { feature: string, micro: string, tiny: string, isBetter: boolean }) {
  return (
    <div className="grid grid-cols-3 p-6 border-b border-border hover:bg-surface transition-colors items-center">
      <div className="font-medium text-foreground">{feature}</div>
      <div className="text-center font-semibold text-green-400 flex items-center justify-center gap-2">
        {isBetter && <Check size={18} />}
        {micro}
      </div>
      <div className="text-center text-subtle flex items-center justify-center gap-2">
        {!isBetter && <Check size={18} />}
        {tiny}
      </div>
    </div>
  );
}
