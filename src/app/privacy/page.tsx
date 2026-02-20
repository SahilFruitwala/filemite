import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export const metadata: Metadata = {
  title: "Privacy Policy - MicroPng",
  description: "Learn how MicroPng handles your data. Spoiler: We don't store your images.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <PageHeader 
          title={<>Privacy <span className="text-primary">Policy</span></>}
          description="Your privacy is our priority. Since we process everything locally, your data stays yours."
        />

        <div className="max-w-4xl mx-auto space-y-8">
          <GlassCard className="p-8 md:p-12 space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. Local-First Processing</h2>
              <p className="text-muted-foreground leading-relaxed">
                MicroPng is designed with a "local-first" philosophy. Most image processing (compression, resizing, filtering) happens directly in your browser using WebAssembly. Your original images never leave your device for these operations.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. Server-Side Compression</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you choose "Server Mode" for better compression ratios, your images are temporarily sent to our secure, ephemeral worker. These images are processed in-memory and the result is streamed back to you immediately. **We do not store your images or any metadata associated with them.** Once the request is completed, the data is completely wiped from the server's memory.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. Analytics</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use PostHog for anonymous usage analytics to help us improve the tool. We track events like "image compressed" or "format changed," but we do not collect personal data, IP addresses in a way that identifies you, or any content of the images you process.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use minimal cookies for essential site functionality and for the anonymous analytics mentioned above. You can disable these in your browser settings, though it might affect some features.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this policy from time to time. Any changes will be posted on this page with an updated revision date.
              </p>
            </section>

            <div className="pt-8 border-t border-border/50 text-sm text-muted-foreground">
              Last Updated: February 20, 2026
            </div>
          </GlassCard>
        </div>
      </main>
      <Footer />
    </div>
  );
}
