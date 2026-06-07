"use client";

import { useMarketDepth } from "@/hooks/useMarketDepth";
import type { Token } from "@/lib/tokens";
import {
  baseUnitsToNumber,
  formatPercent,
  formatTokenBalance,
  truncateAddress,
} from "@/lib/utils";
import { humanizeError } from "@/lib/errors";

interface LenderOrderbookProps {
  loanToken: Token;
  collateralToken: Token;
}

export function LenderOrderbook({
  loanToken,
  collateralToken,
}: LenderOrderbookProps) {
  const depth = useMarketDepth(collateralToken.address, loanToken.address);

  if (depth.isPending) {
    return (
      <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
        <p className="text-text-secondary">Loading order book…</p>
      </div>
    );
  }

  if (depth.isError) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-12 text-center">
        <p className="text-sm text-text-secondary">
          Couldn&apos;t load order book. {humanizeError(depth.error)}
        </p>
      </div>
    );
  }

  const steps = depth.data?.steps ?? [];

  if (steps.length === 0) {
    return (
      <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
        <p className="text-text-secondary">
          No lenders are currently offering {loanToken.symbol} against{" "}
          {collateralToken.symbol}.
        </p>
      </div>
    );
  }

  // For the depth-bar width we only need the proportion of each step's
  // cumulative to the final total — convert via `baseUnitsToNumber` once.
  // Display amounts use `formatTokenBalance` straight off the bigint.
  const totalDepthFloat =
    steps.length > 0
      ? baseUnitsToNumber(
          steps[steps.length - 1].cumulativeAmount,
          loanToken.decimals,
        )
      : 0;
  const amountDecimals = Math.min(loanToken.decimals, 6);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg-sunken font-mono">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-text-muted">
        <span>Lender</span>
        <span>Rate</span>
        <span className="text-right">Size ({loanToken.symbol})</span>
        <span className="text-right">Total ({loanToken.symbol})</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {steps.map((step, i) => {
          const cumFloat = baseUnitsToNumber(
            step.cumulativeAmount,
            loanToken.decimals,
          );
          const depthPct =
            totalDepthFloat > 0 ? (cumFloat / totalDepthFloat) * 100 : 0;
          const delay = `${i * 35}ms`;
          return (
            <div
              key={`${step.lender}-${i}`}
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
                title={step.lender}
              >
                {truncateAddress(step.lender)}
              </span>
              <span className="relative font-semibold text-accent">
                {formatPercent(step.apy)}
              </span>
              <span className="relative text-right text-text-primary">
                {formatTokenBalance(step.sizeAmount, loanToken.decimals, {
                  maxDecimals: amountDecimals,
                })}
              </span>
              <span className="relative text-right text-text-muted">
                {formatTokenBalance(step.cumulativeAmount, loanToken.decimals, {
                  maxDecimals: amountDecimals,
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
