"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  nextSort,
  SortableHeader,
  type SortState,
} from "@/components/ui/SortableHeader";
import { MarketStatusModal } from "./MarketStatusModal";
import { type LenderMarket } from "@/lib/lender";
import { useSetRate } from "@/hooks/useLenderProfileWrite";
import { useLenderMarkets } from "@/hooks/useLenderMarkets";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";

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
      return a.totalCollateral.usd - b.totalCollateral.usd;
    case "onLoan":
      return a.totalBorrowAssets.usd - b.totalBorrowAssets.usd;
    case "apy":
      return a.apyGenerated - b.apyGenerated;
    case "status":
      return a.status.localeCompare(b.status);
  }
}

// Caveat: setRate is per loan token, so two markets sharing a loanToken
// pause/resume together until a per-pair kill-switch lands on the contract.
export function MyMarketsCard() {
  const address = useEmbeddedAddress();
  const query = useLenderMarkets(address);
  const markets = useMemo(() => query.data ?? [], [query.data]);

  const [statusMarket, setStatusMarket] = useState<LenderMarket | null>(null);
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingNextStatus, setPendingNextStatus] = useState<
    LenderMarket["status"] | null
  >(null);

  const setRateHook = useSetRate();
  const isSubmitting = setRateHook.isPending || setRateHook.isConfirming;

  useEffect(() => {
    if (!setRateHook.isSuccess || !pendingId || !pendingNextStatus) return;
    const targetMarket = markets.find((m) => m.id === pendingId);
    setStatusMarket(null);
    setPendingId(null);
    setPendingNextStatus(null);
    setRateHook.reset();
    // Refetch so the new pause/active status comes from the indexer.
    query.refetch();
    if (targetMarket) {
      const pairLabel = `${targetMarket.collateralToken.symbol} / ${targetMarket.loanToken.symbol}`;
      toast.success(
        pendingNextStatus === "paused"
          ? `${pairLabel} paused`
          : `${pairLabel} resumed`,
        {
          description:
            pendingNextStatus === "paused"
              ? "New borrows are stopped. Existing positions stay open."
              : `Rate restored to ${(targetMarket.ratePerSecond * 100).toFixed(2)}%.`,
        },
      );
    }
  }, [setRateHook.isSuccess, pendingId, pendingNextStatus, setRateHook, markets, query]);

  useEffect(() => {
    if (!setRateHook.error) return;
    setPendingId(null);
    setPendingNextStatus(null);
    toast.error("Transaction failed", {
      description: humanizeError(setRateHook.error),
    });
  }, [setRateHook.error]);

  const handleConfirm = () => {
    if (!statusMarket) return;
    const willPause = statusMarket.status === "active";
    const targetRate = willPause ? 0 : statusMarket.ratePerSecond;
    setPendingId(statusMarket.id);
    setPendingNextStatus(willPause ? "paused" : "active");
    setRateHook.setRate(statusMarket.loanToken.address, targetRate);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setStatusMarket(null);
    setRateHook.reset();
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
      {query.isPending ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">Loading your markets…</p>
        </div>
      ) : query.isError ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-12 text-center">
          <p className="text-sm text-text-secondary">
            Couldn&apos;t load your markets. {humanizeError(query.error)}
          </p>
        </div>
      ) : markets.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-primary">
            No active markets yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Once you save a rate and accept collateral below, the matching
            markets will show up here for you to pause or resume.
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
                          {formatCompact(m.totalCollateral.amount)}{" "}
                          {m.collateralToken.symbol}
                        </p>
                        <p className="text-xs tabular-nums text-text-muted">
                          {formatUsd(m.totalCollateral.usd)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium tabular-nums text-text-primary">
                          {formatCompact(m.totalBorrowAssets.amount)}{" "}
                          {m.loanToken.symbol}
                        </p>
                        <p className="text-xs tabular-nums text-text-muted">
                          {formatUsd(m.totalBorrowAssets.usd)}
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
                          disabled={isSubmitting}
                          className="inline-flex h-9 w-28 items-center justify-center gap-1.5 rounded-md border border-border bg-bg px-3 text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary disabled:pointer-events-none disabled:opacity-50"
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
        onClose={handleClose}
        onConfirm={handleConfirm}
        submitting={isSubmitting}
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

