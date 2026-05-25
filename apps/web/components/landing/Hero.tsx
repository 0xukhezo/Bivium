import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[480px] max-w-5xl bg-[radial-gradient(ellipse_at_top,_var(--color-arb-cyan)_0%,_transparent_60%)] opacity-[0.08]"
      />
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-32 lg:px-12 lg:pt-32">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">
          <span className="font-mono">/ ˈbɪv.i.əm /</span> · Latin, &ldquo;a place where two paths meet&rdquo;
        </p>
        <h1 className="mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary md:text-6xl">
          Be your own <span className="text-accent">Aave</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-text-secondary">
          Bivium turns your EOA into a personal lending protocol. Your wallet is the venue.
          Your identity is the brand. Your terms are the law.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/market"
            className="inline-flex h-12 items-center rounded-md bg-accent px-6 text-base font-medium text-arb-white hover:bg-accent-hover hover:shadow-glow-cyan transition-shadow duration-base ease-out-expo"
          >
            Enter the app
          </Link>
          <Link
            href="#how"
            className="inline-flex h-12 items-center rounded-md border border-border px-6 text-base font-medium text-text-primary hover:bg-bg-elevated transition-colors duration-base ease-out-expo"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
