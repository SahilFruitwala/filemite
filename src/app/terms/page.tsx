import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';

export const metadata: Metadata = {
  title: "Terms of Service - MicroPng",
  description: "The rules of the road for using MicroPng.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <PageHeader 
          title={<>Terms of <span className="text-primary">Service</span></>}
          description="Simple rules for a simple tool."
        />

        <div className="max-w-4xl mx-auto space-y-8">
          <GlassCard className="p-8 md:p-12 space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using MicroPng, you agree to be bound by these Terms of Service. If you do not agree, please do not use the tool.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                MicroPng provides image optimization services, including compression, resizing, and format conversion. The service is provided "as is" and "as available."
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for the images you upload and process. You must not use the tool for any illegal purposes or to process content that violates any laws or rights of third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, MicroPng and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                MicroPng is open-source under the MIT License. You are free to use, modify, and distribute the code in accordance with the license terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">6. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.
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
