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
import { MOCK_LENDER_MARKETS, type LenderMarket } from "@/lib/lender";
import { useSetRate } from "@/hooks/useLenderProfileWrite";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";
import { toast } from "@/lib/toast";

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

/**
 * Pause/resume is wired to BiviumProfile.setRate(loanToken, rate):
 *   pause  → setRate(loanToken, 0)
 *   resume → setRate(loanToken, market.ratePerSecond)
 *
 * Caveat: setRate is keyed per loan token, not per (collateral, loan) pair.
 * Two markets sharing the same loanToken will pause / resume together. If
 * pair-scoped control becomes a requirement, this code needs to migrate to
 * a future per-market kill-switch on the Profile contract. */
export function MyMarketsCard() {
  const [markets, setMarkets] = useState<LenderMarket[]>(MOCK_LENDER_MARKETS);
  const [statusMarket, setStatusMarket] = useState<LenderMarket | null>(null);
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  // Track the in-flight toggle so we know which row to flip once the receipt
  // confirms (or to leave alone if the user rejects in their wallet).
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingNextStatus, setPendingNextStatus] = useState<
    LenderMarket["status"] | null
  >(null);

  const setRateHook = useSetRate();
  const isSubmitting = setRateHook.isPending || setRateHook.isConfirming;

  // Flip status locally on receipt; clear pending tracking either way.
  useEffect(() => {
    if (!setRateHook.isSuccess || !pendingId || !pendingNextStatus) return;
    const targetMarket = markets.find((m) => m.id === pendingId);
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === pendingId ? { ...m, status: pendingNextStatus } : m,
      ),
    );
    setStatusMarket(null);
    setPendingId(null);
    setPendingNextStatus(null);
    setRateHook.reset();
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
  }, [setRateHook.isSuccess, pendingId, pendingNextStatus, setRateHook, markets]);

  useEffect(() => {
    if (!setRateHook.error) return;
    setPendingId(null);
    setPendingNextStatus(null);
    toast.error("Transaction failed", {
      description: readableWriteError(setRateHook.error),
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

/** Surface the most useful message out of wagmi / viem errors. The
 *  long stack is overwhelming; `shortMessage` is curated when present. */
function readableWriteError(err: Error): string {
  const anyErr = err as Error & { shortMessage?: string };
  return anyErr.shortMessage ?? err.message;
}
