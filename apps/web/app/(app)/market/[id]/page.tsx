import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
import { getMarketById } from "@/lib/markets";
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

      <header className="mb-8 flex flex-wrap items-center gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total liquidity"
          value={`${formatCompact(market.totalLiquidity.amount)} ${loanToken.symbol}`}
          sub={formatUsd(market.totalLiquidity.usd)}
        />
        <Stat
          label="Total borrowed"
          value={`${formatCompact(market.totalBorrowed.amount)} ${loanToken.symbol}`}
          sub={formatUsd(market.totalBorrowed.usd)}
        />
        <Stat label="LLTV" value={formatPercent(market.lltv)} />
        <Stat label="Rate" value={formatPercent(market.rate)} />
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardLabel>{label}</CardLabel>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </p>
      {sub ? (
        <p className="mt-1 text-sm tabular-nums text-text-muted">{sub}</p>
      ) : null}
    </Card>
  );
}
