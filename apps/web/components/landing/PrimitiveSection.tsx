import { SectionEyebrow } from "./SectionEyebrow";

export function PrimitiveSection() {
  return (
    <section id="primitive" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 mx-auto h-[480px] max-w-5xl bg-[radial-gradient(ellipse_at_center,_var(--color-arb-cyan)_0%,_transparent_60%)] opacity-[0.06]"
      />
      <div className="mx-auto max-w-7xl px-6 py-28 lg:px-12 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-24">
          <div>
            <SectionEyebrow number="02" label="The primitive" />
            <h2 className="mt-6 text-balance text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary">
              Each wallet is a venue.
            </h2>
            <p className="mt-6 max-w-lg text-text-secondary">
              A Bivium market is single-lender. One sovereign EOA signs which
              collaterals it accepts, at which LTVs, at which rate. No DAO can
              change those terms. No other depositor can drag your capital
              into a trade you didn&apos;t approve.
            </p>
            <p className="mt-5 max-w-lg text-text-secondary">
              When something does go wrong, the damage stays with the lenders
              who signed the exposure. Your market keeps working.
            </p>
          </div>

          <LenderCardMock />
        </div>
      </div>
    </section>
  );
}

function LenderCardMock() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-px rounded-xl bg-gradient-to-b from-accent/40 via-border to-transparent"
      />
      <div className="relative rounded-xl border border-border bg-bg-elevated p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-semibold text-arb-white"
              style={{
                background:
                  "radial-gradient(circle at 35% 25%, #2a6cff 0%, #0a3d9e 60%, #04204f 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)",
              }}
            >
              cb
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-text-primary">
                cobie.eth
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                0x4Cba…dE5e
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-success/40 bg-success/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-success">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Open
          </span>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-4 border-t border-border pt-6">
          <Stat label="Supply" value="USDC" />
          <Stat label="Rate" value="6.20%" highlight />
          <Stat label="HF min" value="1.20" />
        </div>

        <div className="mt-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
            Accepts collateral
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Pill label="WBTC" />
            <Pill label="WETH" />
            <Pill label="ARB" />
            <span className="ml-1 font-mono text-[11px] text-text-muted">
              + 2 more
            </span>
          </div>
        </div>

        {/* Order-book preview strip — depth bars + a price ladder. */}
        <div className="mt-7 rounded-md border border-border bg-bg-sunken p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-text-muted">
            <span>Bivium · USDC book</span>
            <span className="font-mono">live</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              { rate: "5.95%", w: "60%" },
              { rate: "6.20%", w: "92%", you: true },
              { rate: "6.40%", w: "44%" },
              { rate: "6.75%", w: "28%" },
            ].map((row) => (
              <div key={row.rate} className="relative h-5 overflow-hidden rounded-sm">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{ width: row.w, background: "var(--depth-bar)" }}
                />
                <div className="relative flex items-center justify-between px-2 text-[11px]">
                  <span className={row.you ? "font-mono text-text-primary" : "font-mono text-text-secondary"}>
                    {row.rate}
                  </span>
                  {row.you ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                      you
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p
        className={`mt-1.5 text-lg font-semibold tabular-nums tracking-tight ${highlight ? "text-accent" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-border bg-bg px-2.5 py-1 font-mono text-[11px] text-text-secondary">
      {label}
    </span>
  );
}

