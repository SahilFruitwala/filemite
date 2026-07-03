import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <main className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <p className="text-8xl sm:text-9xl font-bold tracking-tight text-primary">404</p>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Page not found
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The page you're looking for doesn't exist or has been moved. Let's
              get you back to compressing images.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button size="lg" asChild>
              <Link to="/">Back to home</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/crop">Crop an image</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
