import Link from "next/link";
import { BorrowFlowDiagram } from "./BorrowFlowDiagram";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Layered background: top radial accent + hairline grid scaffold. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[680px] max-w-6xl bg-[radial-gradient(ellipse_at_top,_var(--color-arb-cyan)_0%,_transparent_55%)] opacity-[0.10]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,166,200,.06) 1px, transparent 1px)",
          backgroundSize: "96px 100%",
        }}
      />

      <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-28 pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20 lg:px-12 lg:pb-36 lg:pt-32">
        <div className="relative">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-text-muted">
            <span className="text-text-secondary">Sovereign lending</span>
          </div>

          <h1 className="mt-8 max-w-2xl text-balance text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-text-primary">
            Lend on{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-accent">your terms</span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 right-0 h-[6px] rounded-full bg-accent/30 blur-[2px]"
              />
            </span>
            <span className="text-text-muted">.</span>
          </h1>

          <p className="mt-8 max-w-xl text-balance text-lg leading-relaxed text-text-secondary">
            Bivium turns your EOA into a personal lending venue on Arbitrum.
            Your wallet is the protocol. Your identity is the brand. Your terms
            are the law.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link
              href="/market"
              className="group inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-medium text-arb-white transition-shadow duration-base ease-out-expo hover:bg-accent-hover hover:shadow-glow-cyan"
            >
              Enter the app
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                aria-hidden
                className="transition-transform duration-base ease-out-expo group-hover:translate-x-0.5"
              >
                <path
                  d="M2 7h9M7 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="#primitive"
              className="inline-flex h-12 items-center rounded-md border border-border bg-bg-elevated/40 px-6 text-base font-medium text-text-primary backdrop-blur transition-colors duration-base ease-out-expo hover:bg-bg-elevated"
            >
              How it works
            </Link>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-x-6 border-t border-border pt-6">
            <Meta label="Network" value="Arbitrum" />
            <Meta label="Standard" value="EIP-7702" />
            <Meta label="Status" value="Beta" pulse />
          </dl>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-6 text-[10px] uppercase tracking-[0.22em] text-text-muted"
          >
            <span className="font-mono">borrow-loop.v1</span>
          </div>
          <BorrowFlowDiagram />
          <CornerTics />
        </div>
      </div>
    </section>
  );
}

function Meta({
  label,
  value,
  pulse,
}: {
  label: string;
  value: string;
  pulse?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-1.5 font-mono text-sm text-text-primary">
        {pulse ? (
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-success" />
          </span>
        ) : null}
        {value}
      </dd>
    </div>
  );
}

function CornerTics() {
  const base = "pointer-events-none absolute h-3 w-3 border-accent/40";
  return (
    <>
      <span aria-hidden className={`${base} left-0 top-0 border-l border-t`} />
      <span aria-hidden className={`${base} right-0 top-0 border-r border-t`} />
      <span
        aria-hidden
        className={`${base} left-0 bottom-0 border-l border-b`}
      />
      <span
        aria-hidden
        className={`${base} right-0 bottom-0 border-r border-b`}
      />
    </>
  );
}
