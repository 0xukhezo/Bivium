import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LenderOrderbook } from "@/components/market/LenderOrderbook";
import { MarketDetailActions } from "@/components/market/MarketDetailActions";
import { getMarketById, type Market } from "@/lib/markets";
import {
  formatCompact,
  formatPercent,
  formatUsd,
  truncateAddress,
} from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const market = getMarketById(params.id);
  return {
    title: market
      ? `${market.collateralToken.symbol} / ${market.loanToken.symbol} · Bivium`
      : "Market · Bivium",
  };
}

export default function MarketDetailPage({ params }: PageProps) {
  const market = getMarketById(params.id);
  if (!market) notFound();

  const { collateralToken, loanToken } = market;

  return (
    <>
      <Link
        href="/market"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors duration-base ease-out-expo hover:text-text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to markets
      </Link>

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
              <CardTitle>Utilization</CardTitle>
              <span className="text-xs text-text-muted">
                {formatPercent(utilization(market))} borrowed
              </span>
            </CardHeader>
            <ChartPlaceholder />
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
  return market.totalLiquidity.usd > 0
    ? market.totalBorrowed.usd / market.totalLiquidity.usd
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
          {formatPercent(market.rate)}
        </p>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Stats</h3>
        <div className="flex flex-col gap-5">
          <StatRow
            label="Total liquidity"
            value={`${formatCompact(market.totalLiquidity.amount)} ${loanToken.symbol}`}
            sub={formatUsd(market.totalLiquidity.usd)}
          />
          <StatRow
            label="Total borrowed"
            value={`${formatCompact(market.totalBorrowed.amount)} ${loanToken.symbol}`}
            sub={formatUsd(market.totalBorrowed.usd)}
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

// Subtle area-chart-shaped placeholder — accent-tinted gradient under a
// smooth curve. Swap for a real chart once historical data lands.
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
