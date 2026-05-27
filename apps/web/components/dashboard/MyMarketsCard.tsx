"use client";

import { useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  nextSort,
  SortableHeader,
  type SortState,
} from "@/components/ui/SortableHeader";
import { MarketStatusModal } from "./MarketStatusModal";
import { MOCK_LENDER_MARKETS, type LenderMarket } from "@/lib/lender";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";

type SortKey =
  | "collateral"
  | "loan"
  | "collateralAmount"
  | "onLoan"
  | "apy"
  | "status";

function compare(key: SortKey, a: LenderMarket, b: LenderMarket): number {
  switch (key) {
    case "collateral":
      return a.collateralToken.symbol.localeCompare(b.collateralToken.symbol);
    case "loan":
      return a.loanToken.symbol.localeCompare(b.loanToken.symbol);
    case "collateralAmount":
      return a.collateral.usd - b.collateral.usd;
    case "onLoan":
      return a.onLoan.usd - b.onLoan.usd;
    case "apy":
      return a.apyGenerated - b.apyGenerated;
    case "status":
      return a.status.localeCompare(b.status);
  }
}

export function MyMarketsCard() {
  const [markets, setMarkets] = useState<LenderMarket[]>(MOCK_LENDER_MARKETS);
  const [statusMarket, setStatusMarket] = useState<LenderMarket | null>(null);
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  const confirmToggle = async (id: string) => {
    // Mock blockchain tx. Replace with wagmi writeContract when wired.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "active" ? "paused" : "active" }
          : m,
      ),
    );
  };

  const handleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const sorted = useMemo(() => {
    if (!sort) return markets;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...markets].sort((a, b) => compare(sort.key, a, b) * dir);
  }, [markets, sort]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Your markets</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Markets you&apos;ve created. Pause to stop new borrows.
          </p>
        </div>
      </CardHeader>
      {markets.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">
            You haven&apos;t created any markets yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border bg-bg-sunken text-xs tracking-wider text-text-muted">
                <tr>
                  <SortableHeader
                    label="Collateral"
                    sortKey="collateral"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Loan"
                    sortKey="loan"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Collateral"
                    sortKey="collateralAmount"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="On loan"
                    sortKey="onLoan"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="APY"
                    sortKey="apy"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <th
                    scope="col"
                    className="w-32 px-4 py-3 text-right font-medium"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => {
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <TokenCell token={m.collateralToken} />
                      </td>
                      <td className="px-4 py-4">
                        <TokenCell token={m.loanToken} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium tabular-nums text-text-primary">
                          {formatCompact(m.collateral.amount)}{" "}
                          {m.collateralToken.symbol}
                        </p>
                        <p className="text-xs tabular-nums text-text-muted">
                          {formatUsd(m.collateral.usd)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium tabular-nums text-text-primary">
                          {formatCompact(m.onLoan.amount)} {m.loanToken.symbol}
                        </p>
                        <p className="text-xs tabular-nums text-text-muted">
                          {formatUsd(m.onLoan.usd)}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium tabular-nums text-text-primary">
                        {formatPercent(m.apyGenerated)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            m.status === "active" ? "success" : "neutral"
                          }
                        >
                          {m.status === "active" ? "Active" : "Paused"}
                        </Badge>
                      </td>
                      <td className="w-32 px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setStatusMarket(m)}
                          className="inline-flex h-9 w-28 items-center justify-center gap-1.5 rounded-md border border-border bg-bg px-3 text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary"
                        >
                          {m.status === "active" ? (
                            <>
                              <Pause size={14} aria-hidden="true" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play size={14} aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MarketStatusModal
        market={statusMarket}
        open={statusMarket !== null}
        onClose={() => setStatusMarket(null)}
        onConfirm={confirmToggle}
      />
    </Card>
  );
}

function TokenCell({ token }: { token: Token }) {
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={token.iconUrl}
        alt=""
        aria-hidden="true"
        width={24}
        height={24}
        className="h-6 w-6 shrink-0 rounded-full object-contain"
      />
      <span className="font-medium text-text-primary">{token.symbol}</span>
    </div>
  );
}
