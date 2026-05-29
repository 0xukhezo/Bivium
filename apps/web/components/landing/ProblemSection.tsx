import { SectionEyebrow } from "./SectionEyebrow";

/**
 * The rsETH/Aave incident, rendered as an editorial timeline rather than
 * three stat cards. The numbers anchor a sequence of cause-and-effect, which
 * makes the structural failure read more clearly than isolated stats.
 */
export function ProblemSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        // Feathered sunken band — fades in from the surrounding bg at the top,
        // holds bg-sunken through the body, and fades back out at the bottom.
        background:
          "linear-gradient(to bottom, var(--bg) 0%, var(--bg-sunken) 14%, var(--bg-sunken) 86%, var(--bg) 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-28 lg:px-12 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionEyebrow number="01" label="The problem" />
            <h2 className="mt-6 text-balance text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary">
              Pooled lending socializes risk you never signed.
            </h2>
            <p className="mt-6 max-w-md text-balance text-text-secondary">
              In April 2026, an attacker minted ~116,500 unbacked rsETH through
              a Kelp DAO bridge exploit and deposited it into Aave as
              collateral. Aave&apos;s contracts worked exactly as designed.
            </p>

            <blockquote className="mt-8 border-l-2 border-accent/50 pl-5">
              <p className="text-balance text-lg leading-snug text-text-primary">
                A WETH depositor who never wanted rsETH exposure discovered
                their capital was financing it.
              </p>
              <footer className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-text-muted">
                — The structural failure
              </footer>
            </blockquote>
          </div>

          {/* Timeline column. Vertical rail with three calibrated milestones. */}
          <ol className="relative space-y-10 lg:pl-6">
            <div
              aria-hidden
              className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-accent/60 via-border to-transparent"
            />
            <TimelineRow
              t="0h"
              value="$15.1B"
              valueLabel="TVL fled Aave"
              body="Inside 72 hours, depositors raced to withdraw across every pool, accelerating the spiral."
            />
            <TimelineRow
              t="24h"
              value="100%"
              valueLabel="WETH utilization"
              body="The WETH pool was drawn to the cap. Liquidators had no liquidity to repay the bad positions, so liquidations stalled."
            />
            <TimelineRow
              t="96h"
              value="$123–230M"
              valueLabel="Bad debt left behind"
              body="Once dust settled, real WETH lenders were holding the loss — not whoever signed the risk framework that allowed rsETH in the first place."
            />
          </ol>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  t,
  value,
  valueLabel,
  body,
}: {
  t: string;
  value: string;
  valueLabel: string;
  body: string;
}) {
  return (
    <li className="relative pl-8">
      <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted">
        <span className="text-text-primary">{t}</span>
      </div>
      <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-text-primary md:text-5xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-text-secondary">{valueLabel}</p>
      <p className="mt-3 max-w-lg text-text-secondary">{body}</p>
    </li>
  );
}
