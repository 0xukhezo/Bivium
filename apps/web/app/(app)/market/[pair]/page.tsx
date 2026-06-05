"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { MockBadge } from "@/components/ui/MockBadge";
import { LenderOrderbook } from "@/components/market/LenderOrderbook";
import { MarketDetailActions } from "@/components/market/MarketDetailActions";
import { useMarkets } from "@/hooks/useMarkets";
import { getMarketSlug, type Market } from "@/lib/markets";
import {
  formatCompact,
  formatPercent,
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
          {/* TODO(remove-when-real): chart is hard-coded SVG; red border
              flags it as mock until the historical-data endpoint lands. */}
          <Card className="!border-danger">
            <CardHeader>
              <CardTitle>Utilization</CardTitle>
              <MockBadge />
              <span className="text-xs text-text-muted">
                {formatPercent(utilization(market))} borrowed
              </span>
            </CardHeader>
            <ChartPlaceholder />
          </Card>

          {/* TODO(remove-when-real): LenderOrderbook reads from
              lib/lender-offers.ts (deterministic mocks). Red border flags it
              as mock until the orderbook depth endpoint lands. */}
          <Card className="!border-danger">
            <CardHeader>
              <CardTitle>Order book</CardTitle>
              <MockBadge />
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
  return market.totalSupplyAssets.usd > 0
    ? market.totalBorrowAssets.usd / market.totalSupplyAssets.usd
    : 0;
}

function StatsPanel({ market }: { market: Market }) {
  const { loanToken } = market;
  const util = utilization(market);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-sm text-text-secondary">Rate</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-text-primary">
          {formatPercent(market.ratePerSecond)}
        </p>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Stats</h3>
        <div className="flex flex-col gap-5">
          <StatRow
            label="Total liquidity"
            value={`${formatCompact(market.totalSupplyAssets.amount)} ${loanToken.symbol}`}
            sub={formatUsd(market.totalSupplyAssets.usd)}
          />
          <StatRow
            label="Total borrowed"
            value={`${formatCompact(market.totalBorrowAssets.amount)} ${loanToken.symbol}`}
            sub={formatUsd(market.totalBorrowAssets.usd)}
          />
          <StatRow label="LLTV" value={formatPercent(market.lltv)} />
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

// TODO: replace with real chart from historical-data endpoint.
function ChartPlaceholder() {
  return (
    <div className="relative h-72 overflow-hidden rounded-md border border-border bg-bg-sunken">
      <svg
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,120 C40,90 80,110 120,80 C160,55 200,75 240,60 C280,48 320,70 360,40 L400,30 L400,160 L0,160 Z"
          fill="url(#chart-fill)"
        />
        <path
          d="M0,120 C40,90 80,110 120,80 C160,55 200,75 240,60 C280,48 320,70 360,40 L400,30"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute bottom-3 right-3 rounded-pill border border-border bg-bg/80 px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted backdrop-blur">
        Chart placeholder
      </span>
    </div>
  );
}
