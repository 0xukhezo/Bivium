import Link from "next/link";
import { SectionEyebrow } from "./SectionEyebrow";

export function CtaBand() {
  return (
    <section className="bg-blueprint relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg to-transparent"
      />
      <div className="mx-auto max-w-5xl px-6 py-28 lg:px-12 lg:py-32">
        <div className="flex flex-col items-center text-center">
          <SectionEyebrow number="04" label="Begin" />
          <h2 className="mt-6 text-balance text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.05] tracking-tight text-text-primary">
            Open your market.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-text-secondary">
            One transaction installs the delegation on your EOA. From that
            moment, your wallet is the venue — and the orderbook knows you by
            name.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-medium text-arb-white transition-shadow duration-base ease-out-expo hover:bg-accent-hover hover:shadow-glow-cyan"
            >
              Activate as a lender
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="transition-transform duration-base ease-out-expo group-hover:translate-x-0.5">
                <path d="M2 7h9M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/market"
              className="inline-flex h-12 items-center rounded-md border border-border bg-bg-elevated/60 px-6 text-base font-medium text-text-primary backdrop-blur transition-colors duration-base ease-out-expo hover:bg-bg-elevated"
            >
              Browse markets
            </Link>
          </div>

          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted">
            No deposit. No approval. Revocable on-chain.
          </p>
        </div>
      </div>
    </section>
  );
}
