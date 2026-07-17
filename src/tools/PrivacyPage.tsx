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
          <GlassCard className="p-6 sm:p-8 md:p-12 space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. In-memory processing</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you compress, scrub, or generate favicons, your image is uploaded to our
                server, processed in memory with Sharp, and the result is streamed back
                immediately. We do not write your images to disk or object storage.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. No image retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                Once the request finishes, image data is discarded from server memory. We do not
                keep copies, thumbnails, or EXIF extracts beyond that request.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. Analytics</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use PostHog for anonymous usage analytics (for example, that a compression
                finished and which preset was used). We do not collect the content of your images.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use minimal cookies for essential site functionality and anonymous analytics.
                You can disable these in your browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Changes</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this policy from time to time. Changes will be posted on this page
                with an updated revision date.
              </p>
            </section>

            <div className="pt-8 border-t border-border/50 text-sm text-muted-foreground">
              Last Updated: July 17, 2026
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
