import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="py-12 border-t border-border mt-20 bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-sm">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/icon.webp"
                alt="MicroPNG logo"
                width={32}
                height={32}
                className="rounded-lg border border-border shadow-sm"
              />
              <span className="text-xl font-bold tracking-tight text-foreground">
                MicroPNG
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-sm">
              Professional image optimization in your browser. <br />
              No server uploads. No compromises.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Tools</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Compress
              </Link>
              <Link to="/convert" className="text-muted-foreground hover:text-primary transition-colors">
                Convert
              </Link>
              <Link to="/crop" className="text-muted-foreground hover:text-primary transition-colors">
                Crop
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Legal &amp; Code</h4>
            <div className="flex flex-col gap-2">
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <a
                href="https://github.com/SahilFruitwala/micropng"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Sahil Fruitwala. MIT Licensed.</p>
          <div className="flex items-center gap-2">
            <span>Made with</span>
            <Heart size={12} className="text-destructive fill-destructive" />
            <span>and 🍊 using TanStack Start</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
