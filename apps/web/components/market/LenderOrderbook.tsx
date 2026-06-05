"use client";

import { useMemo } from "react";
import { offersForPair } from "@/lib/lender-offers";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, truncateAddress } from "@/lib/utils";

interface LenderOrderbookProps {
  loanToken: Token;
  collateralToken: Token;
}

export function LenderOrderbook({
  loanToken,
  collateralToken,
}: LenderOrderbookProps) {
  const offers = useMemo(
    () => offersForPair(loanToken, collateralToken),
    [loanToken, collateralToken],
  );

  if (offers.length === 0) {
    return (
      <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
        <p className="text-text-secondary">
          No lenders are currently offering {loanToken.symbol} against{" "}
          {collateralToken.symbol}.
        </p>
      </div>
    );
  }

  let running = 0;
  const rows = offers.map((offer) => {
    running += offer.indicativeSize.amount;
    return { offer, cumulative: running };
  });
  const totalDepth = running;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg-sunken font-mono">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-text-muted">
        <span>Lender</span>
        <span>Rate</span>
        <span className="text-right">Size ({loanToken.symbol})</span>
        <span className="text-right">Total ({loanToken.symbol})</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {rows.map(({ offer, cumulative }, i) => {
          const depthPct = (cumulative / totalDepth) * 100;
          const delay = `${i * 35}ms`;
          return (
            <div
              key={offer.lender}
              className="orderbook-row relative grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-3 py-1.5 text-xs tabular-nums transition-colors duration-base ease-out-expo hover:bg-bg-elevated/50"
              style={{ animationDelay: delay }}
            >
              <span
                aria-hidden="true"
                className="orderbook-depth pointer-events-none absolute left-0 top-0 h-full"
                style={{
                  width: `${depthPct}%`,
                  backgroundColor: "var(--depth-bar)",
                  animationDelay: delay,
                }}
              />
              <span
                className="relative min-w-0 truncate text-text-primary"
                title={offer.lender}
              >
                {truncateAddress(offer.lender)}
              </span>
              <span className="relative font-semibold text-accent">
                {formatPercent(offer.ratePerSecond)}
              </span>
              <span className="relative text-right text-text-primary">
                {formatCompact(offer.indicativeSize.amount)}
              </span>
              <span className="relative text-right text-text-muted">
                {formatCompact(cumulative)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
