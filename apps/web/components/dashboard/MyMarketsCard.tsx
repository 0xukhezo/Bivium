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
import {
  usePauseProfile,
  useUnpauseProfile,
} from "@/hooks/useLenderProfileWrite";
import { useLenderProfile } from "@/hooks/useLenderProfile";
import { useLenderMarkets } from "@/hooks/useLenderMarkets";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
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

// `BiviumProfile.pause()` is a single global flag — pausing stops new
// borrows across **every** market this lender runs (the contract checks
// `paused` in every supply/borrow path). The per-row Pause/Resume button
// still triggers the same global op; we surface that clearly in the
// confirmation modal. Status badges read off the on-chain `paused` flag so
// all rows toggle in lockstep.
export function MyMarketsCard() {
  const address = useEmbeddedAddress();
  const query = useLenderMarkets(address);
  const markets = useMemo(() => query.data ?? [], [query.data]);

  const profile = useLenderProfile();
  const isPaused = profile.paused === true;

  const [statusMarket, setStatusMarket] = useState<LenderMarket | null>(null);
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  const pauseHook = usePauseProfile();
  const unpauseHook = useUnpauseProfile();
  const isPausing = pauseHook.isPending || pauseHook.isConfirming;
  const isUnpausing = unpauseHook.isPending || unpauseHook.isConfirming;
  const isSubmitting = isPausing || isUnpausing;

  useEffect(() => {
    if (!pauseHook.isSuccess) return;
    const hash = pauseHook.hash;
    profile.refetch();
    query.refetch();
    setStatusMarket(null);
    pauseHook.reset();
    toast.success("Profile paused", {
      description:
        "All your markets stopped accepting new borrows. Existing positions stay open.",
      action: txAction(hash),
    });
  }, [pauseHook.isSuccess, pauseHook, profile, query]);

  useEffect(() => {
    if (!unpauseHook.isSuccess) return;
    const hash = unpauseHook.hash;
    profile.refetch();
    query.refetch();
    setStatusMarket(null);
    unpauseHook.reset();
    toast.success("Profile resumed", {
      description: "All your markets are open to new borrows again.",
      action: txAction(hash),
    });
  }, [unpauseHook.isSuccess, unpauseHook, profile, query]);

  useEffect(() => {
    if (!pauseHook.error) return;
    toast.error("Pause failed", { description: humanizeError(pauseHook.error) });
    pauseHook.reset();
  }, [pauseHook.error, pauseHook]);

  useEffect(() => {
    if (!unpauseHook.error) return;
    toast.error("Resume failed", {
      description: humanizeError(unpauseHook.error),
    });
    unpauseHook.reset();
  }, [unpauseHook.error, unpauseHook]);

  const handleConfirm = () => {
    if (isSubmitting) return;
    if (isPaused) {
      unpauseHook.unpause();
    } else {
      pauseHook.pause();
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setStatusMarket(null);
    pauseHook.reset();
    unpauseHook.reset();
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
                          variant={isPaused ? "neutral" : "success"}
                        >
                          {isPaused ? "Paused" : "Active"}
                        </Badge>
                      </td>
                      <td className="w-32 px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setStatusMarket(m)}
                          disabled={isSubmitting || profile.pausedLoading}
                          className="inline-flex h-9 w-28 items-center justify-center gap-1.5 rounded-md border border-border bg-bg px-3 text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary disabled:pointer-events-none disabled:opacity-50"
                        >
                          {isPaused ? (
                            <>
                              <Play size={14} aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <Pause size={14} aria-hidden="true" />
                              <span>Pause</span>
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
        isPaused={isPaused}
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

