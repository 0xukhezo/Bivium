import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "../ThemeToggle";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-transparent bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/market"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-arb-white hover:bg-accent-hover hover:shadow-glow-cyan transition-shadow duration-base ease-out-expo"
          >
            Go to App
          </Link>
        </div>
      </div>
    </header>
  );
}
