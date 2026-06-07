"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DepthChart } from "@/components/market/DepthChart";
import { LenderOrderbook } from "@/components/market/LenderOrderbook";
import { MarketDetailActions } from "@/components/market/MarketDetailActions";
import { useMarketDepth } from "@/hooks/useMarketDepth";
import { useMarkets } from "@/hooks/useMarkets";
import { getMarketSlug, type Market } from "@/lib/markets";
import {
  fixedPointToFraction,
  formatPercent,
  formatTokenBalance,
  formatUsd,
  truncateAddress,
} from "@/lib/utils";
import { humanizeError } from "@/lib/errors";

export default function MarketDetailPage() {
  const params = useParams<{ pair: string }>();
  const pair = params.pair?.toLowerCase() ?? "";

  const query = useMarkets();
  const market = useMemo(() => {
    if (!query.data) return undefined;
    return query.data.find((m) => getMarketSlug(m) === pair);
  }, [query.data, pair]);

  // Dynamic <title> — client components can't use generateMetadata.
  useEffect(() => {
    if (!market) return;
    document.title = `${market.collateralToken.symbol} / ${market.loanToken.symbol} · Bivium`;
    return () => {
      document.title = "Bivium";
    };
  }, [market]);

  if (query.isPending) {
    return (
      <>
        <BackLink />
        <Card className="flex items-center justify-center py-16">
          <p className="text-text-secondary">Loading market…</p>
        </Card>
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        <BackLink />
        <Card className="flex items-center justify-center border-danger/30 bg-danger/10 py-16">
          <p className="text-sm text-text-secondary">
            Couldn&apos;t load market. {humanizeError(query.error)}
          </p>
        </Card>
      </>
    );
  }

  if (!market) {
    notFound();
  }

  return <MarketDetail market={market} />;
}

function BackLink() {
  return (
    <Link
      href="/market"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors duration-base ease-out-expo hover:text-text-primary"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Back to markets
    </Link>
  );
}

function MarketDetail({ market }: { market: Market }) {
  const { collateralToken, loanToken } = market;

  return (
    <>
      <BackLink />

      {/* Top section — full-width pair header. */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center -space-x-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collateralToken.iconUrl}
            alt=""
            aria-hidden="true"
            width={44}
            height={44}
            className="h-11 w-11 rounded-full border-2 border-bg bg-bg-elevated object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={loanToken.iconUrl}
            alt=""
            aria-hidden="true"
            width={44}
            height={44}
            className="h-11 w-11 rounded-full border-2 border-bg bg-bg-elevated object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {collateralToken.symbol} / {loanToken.symbol}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Collateral {collateralToken.symbol} · Loan {loanToken.symbol}
          </p>
          <p
            className="mt-0.5 font-mono text-xs text-text-muted"
            title={market.id}
          >
            {truncateAddress(market.id)}
          </p>
        </div>
      </header>

      {/* Body — 2/3 chart + order book on the left, 1/3 stats panel on the right. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Borrow depth</CardTitle>
              <span className="text-xs text-text-muted">
                Rate vs. cumulative borrow size
              </span>
            </CardHeader>
            <DepthChartSection market={market} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order book</CardTitle>
              <span className="text-xs text-text-muted">
                Lenders offering {loanToken.symbol} against{" "}
                {collateralToken.symbol}
              </span>
            </CardHeader>
            <LenderOrderbook
              loanToken={loanToken}
              collateralToken={collateralToken}
            />
          </Card>
        </div>

        <aside className="lg:col-span-1 lg:self-start lg:sticky lg:top-24">
          <div className="flex flex-col gap-4">
            <MarketDetailActions market={market} />
            <StatsPanel market={market} />
          </div>
        </aside>
      </div>
    </>
  );
}

function utilization(market: Market): number {
  const supply = market.totalSupplyAssets.usd ?? 0;
  const borrow = market.totalBorrowAssets.usd ?? 0;
  return supply > 0 ? borrow / supply : 0;
}

function StatsPanel({ market }: { market: Market }) {
  const { loanToken, collateralToken } = market;
  const util = utilization(market);

  // Reuses the same query as DepthChartSection — React Query dedupes the
  // network call, so this is free. `bestRate` is the first lender's APY
  // (the cheapest available). `avgRate` is the size-weighted average APY
  // across all lenders, computed by the indexer as `cumulativeAvgApy` on
  // the last step.
  const depth = useMarketDepth(collateralToken.address, loanToken.address);
  const steps = depth.data?.steps ?? [];
  const bestRate = steps.length > 0 ? steps[0].apy : null;
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const avgRate = lastStep?.cumulativeAvgApy ?? null;
  const ratesLoading = depth.isPending;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-sm text-text-secondary">Rate</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Best
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
              {ratesLoading
                ? "…"
                : bestRate !== null
                  ? formatPercent(bestRate)
                  : "—"}
            </p>
          </div>
          <div className="border-l border-border pl-4">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Weighted avg
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
              {ratesLoading
                ? "…"
                : avgRate !== null
                  ? formatPercent(avgRate)
                  : "—"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Stats</h3>
        <div className="flex flex-col gap-5">
          <StatRow
            label="Total liquidity"
            value={`${formatTokenBalance(market.totalSupplyAssets.amount, loanToken.decimals, { compact: true })} ${loanToken.symbol}`}
            sub={
              market.totalSupplyAssets.usd !== null
                ? formatUsd(market.totalSupplyAssets.usd)
                : undefined
            }
          />
          <StatRow
            label="Total borrowed"
            value={`${formatTokenBalance(market.totalBorrowAssets.amount, loanToken.decimals, { compact: true })} ${loanToken.symbol}`}
            sub={
              market.totalBorrowAssets.usd !== null
                ? formatUsd(market.totalBorrowAssets.usd)
                : undefined
            }
          />
          <StatRow
            label="LLTV"
            value={formatPercent(fixedPointToFraction(market.lltv))}
          />
          <StatRow label="Utilization" value={formatPercent(util)} />
        </div>
      </Card>
    </div>
  );
}

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs tabular-nums text-text-muted">{sub}</p>
      ) : null}
    </div>
  );
}

function DepthChartSection({ market }: { market: Market }) {
  const { loanToken, collateralToken } = market;
  const depth = useMarketDepth(collateralToken.address, loanToken.address);

  if (depth.isPending) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-border bg-bg-sunken text-sm text-text-secondary">
        Loading depth…
      </div>
    );
  }
  if (depth.isError || !depth.data) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-danger/30 bg-danger/10 text-sm text-text-secondary">
        Couldn&apos;t load depth.
      </div>
    );
  }
  const steps = depth.data.steps;
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  return (
    <DepthChart
      steps={steps}
      loanSymbol={loanToken.symbol}
      loanDecimals={loanToken.decimals}
      avgRate={lastStep?.cumulativeAvgApy ?? null}
    />
  );
}
