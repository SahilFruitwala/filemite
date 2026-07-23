import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <main className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-20">
        <PageHeader
          title={
            <>
              Privacy <span className="text-primary">Policy</span>
            </>
          }
          description="Images are processed in-memory and never stored. Here's exactly what that means."
        />

        <div className="max-w-4xl mx-auto space-y-8">
          <GlassCard className="p-6 sm:p-8 md:p-12">
            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">1. In-memory server processing</h2>
                <p className="text-muted-foreground leading-relaxed">
                  When you use Compress, Resize, Scrub, or Favicon, your image is uploaded to our
                  server, processed in memory with Sharp, and the result is streamed back
                  immediately. We do not write your images to disk or object storage.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">2. Browser-only processing</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Crop and Palette run entirely in your browser. Your image is never uploaded or
                  sent to our server for these tools — all processing happens on your device.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">3. No image retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Once a server request finishes, image data is discarded from server memory. We do
                  not keep copies, thumbnails, or EXIF extracts beyond that request.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">4. Analytics</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use PostHog for anonymous usage analytics (for example, that a compression
                  finished and which preset was used). We do not collect the content of your images.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">5. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use minimal cookies for essential site functionality and anonymous analytics.
                  You can disable these in your browser settings.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">6. Changes</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this policy from time to time. Changes will be posted on this page
                  with an updated revision date.
                </p>
              </section>

              <div className="pt-8 border-t border-border/50 text-sm text-muted-foreground">
                Last Updated: July 23, 2026
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
