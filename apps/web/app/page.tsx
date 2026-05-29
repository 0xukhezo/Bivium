import { LandingHeader } from "@/components/layout/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { PrimitiveSection } from "@/components/landing/PrimitiveSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { CtaBand } from "@/components/landing/CtaBand";

export default function LandingPage() {
  return (
    <div className="bg-grain relative">
      <LandingHeader />
      <main>
        <Hero />
        <ProblemSection />
        <PrimitiveSection />
        <FeatureGrid />
        <CtaBand />
      </main>
      <footer className="relative">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between lg:px-12">
          <div className="flex items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Bivium</span>
            <span aria-hidden className="hidden h-3 w-px bg-border sm:inline-block" />
            <span className="font-mono text-xs uppercase tracking-[0.18em]">
              v0.1 · Arbitrum
            </span>
          </div>
          <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em]">
            <a href="https://github.com" className="transition-colors duration-base ease-out-expo hover:text-text-primary">
              GitHub
            </a>
            <a href="https://x.com" className="transition-colors duration-base ease-out-expo hover:text-text-primary">
              Twitter
            </a>
            <a href="#" className="transition-colors duration-base ease-out-expo hover:text-text-primary">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
