import { LandingHeader } from "@/components/layout/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <FeatureGrid />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-sm text-text-muted lg:px-12">
          <span>&copy; {new Date().getFullYear()} Bivium</span>
          <span className="font-mono">Two paths. One loan. No pool.</span>
        </div>
      </footer>
    </>
  );
}
