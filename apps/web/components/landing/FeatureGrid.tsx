import { SectionEyebrow } from "./SectionEyebrow";

const features = [
  {
    n: "01",
    label: "EIP-7702",
    title: "Same wallet, new powers",
    body: "Your EOA delegates execution to the BiviumProfile template. Keep your address, ENS, history. Revoke any time — your private key still controls everything.",
  },
  {
    n: "02",
    label: "Orderbook semantics",
    title: "A credit RFQ, not a pool",
    body: "Every active lender is a resting limit order. Price is their rate, size is their live wallet balance. Borrowing is a market order that walks the book and fills atomically.",
  },
  {
    n: "03",
    label: "Auto-forward",
    title: "Capital never trapped",
    body: "Idle supply lives in your EOA, ready for any opportunity. On every repay, principal returns to you automatically. Zero locked capital. Zero persistent approvals.",
  },
  {
    n: "04",
    label: "Slippage + HF guards",
    title: "Bounded worst case",
    body: "Borrowers set max weighted-average rate and minimum health factor. The router enforces both on-chain — a stale quote can't trap funds.",
  },
  {
    n: "05",
    label: "Curated collateral",
    title: "Oracles you can trust",
    body: "Bivium curates the oracle and LLTV per token. Lenders pick which curated assets to accept. Rogue oracles stay out without forcing centralized governance on rates.",
  },
  {
    n: "06",
    label: "Composable",
    title: "Plug into anything",
    body: "A bivium is just a Morpho-style market. Aggregators, frontends, vaults, and wallets can integrate sovereign lenders as a native borrowing source.",
  },
];

export function FeatureGrid() {
  return (
    <section
      id="how"
      className="relative"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg) 0%, var(--bg-sunken) 14%, var(--bg-sunken) 86%, var(--bg) 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-28 lg:px-12 lg:py-32">
        <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <SectionEyebrow number="03" label="How it works" />
            <h2 className="mt-6 text-balance text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary">
              Programmable lending at the individual level.
            </h2>
          </div>
          <p className="max-w-md text-text-secondary lg:justify-self-end">
            Bivium is a single Morpho-pattern lending engine where every
            lender curates their own risk surface. Below is the contract
            surface a frontend, aggregator, or vault has to know about.
          </p>
        </div>

        {/* Hairline grid — no card walls. Subtle dividers describe the lattice. */}
        <div className="mt-14 grid grid-cols-1 border-t border-border md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.n}
              className={[
                "group relative flex flex-col gap-3 border-b border-border p-7 transition-colors duration-base ease-out-expo hover:bg-bg-elevated/50",
                // Vertical dividers, but only inside the row (not on the trailing edge).
                "md:border-r",
                i % 2 === 1 ? "md:border-r-0 lg:border-r" : "",
                (i + 1) % 3 === 0 ? "lg:border-r-0" : "lg:border-r",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted">
                  {f.n}
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-accent">
                  {f.label}
                </span>
              </div>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-text-primary">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {f.body}
              </p>
              <span
                aria-hidden
                className="mt-auto inline-flex h-px w-8 origin-left bg-accent/40 transition-transform duration-base ease-out-expo group-hover:scale-x-[2.5]"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
