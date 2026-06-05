"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, AlertCircle } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import {
  nextSort,
  SortableHeader,
  type SortState,
} from "@/components/ui/SortableHeader";
import { TokenFilterDropdown } from "@/components/market/TokenFilterDropdown";
import { SUPPORTED_TOKENS, type Token } from "@/lib/tokens";
import { getMarketSlug, type Market } from "@/lib/markets";
import { useMarkets } from "@/hooks/useMarkets";
import { fetchMarketDepth } from "@/lib/api/market-depth";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";

const PAGE_SIZE = 9;

type SortKey =
  | "collateral"
  | "loan"
  | "lltv"
  | "liquidity"
  | "borrowed"
  | "rate"
  | "avgRate";

function compareMarkets(
  key: SortKey,
  a: Market,
  b: Market,
  avgMap: ReadonlyMap<string, number | null>,
): number {
  switch (key) {
    case "collateral":
      return a.collateralToken.symbol.localeCompare(b.collateralToken.symbol);
    case "loan":
      return a.loanToken.symbol.localeCompare(b.loanToken.symbol);
    case "lltv":
      return a.lltv - b.lltv;
    case "liquidity":
      return a.totalSupplyAssets.usd - b.totalSupplyAssets.usd;
    case "borrowed":
      return a.totalBorrowAssets.usd - b.totalBorrowAssets.usd;
    case "rate":
      return a.ratePerSecond - b.ratePerSecond;
    case "avgRate":
      // Rows whose avg isn't loaded yet (or has no lenders) sort to the
      // end ascending — same convention `MyLoansCard` uses for null HF.
      return (
        (avgMap.get(a.id) ?? Number.POSITIVE_INFINITY) -
        (avgMap.get(b.id) ?? Number.POSITIVE_INFINITY)
      );
  }
}

export function MarketTable() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(
    new Set(),
  );
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);
  const [page, setPage] = useState(1);

  const marketsQuery = useMarkets();
  const markets = useMemo(() => marketsQuery.data ?? [], [marketsQuery.data]);

  // Fan out one depth query per market so we can show + sort by the
  // size-weighted avg rate. React Query keys these the same way the
  // detail-page hook does, so clicking through to /market/[pair] reuses
  // the cached fetch instead of refiring it.
  const depthQueries = useQueries({
    queries: markets.map((m) => ({
      queryKey: [
        "market-depth",
        m.collateralToken.address.toLowerCase(),
        m.loanToken.address.toLowerCase(),
      ] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchMarketDepth(m.collateralToken.address, m.loanToken.address, {
          signal,
        }),
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    })),
  });
  const depthByMarketId = useMemo(() => {
    const map = new Map<
      string,
      { avgRate: number | null; isPending: boolean }
    >();
    markets.forEach((m, i) => {
      const q = depthQueries[i];
      const steps = q?.data?.steps ?? [];
      const last = steps.length > 0 ? steps[steps.length - 1] : null;
      map.set(m.id, {
        avgRate: last?.cumulativeAvgApy ?? null,
        isPending: q?.isPending ?? true,
      });
    });
    return map;
  }, [markets, depthQueries]);
  const avgRateById = useMemo(() => {
    const map = new Map<string, number | null>();
    depthByMarketId.forEach((v, id) => map.set(id, v.avgRate));
    return map;
  }, [depthByMarketId]);

  const toggleToken = (address: string) => {
    setSelectedAddresses((prev) => {
      const next = new Set(prev);
      const key = address.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    setSort((prev) => nextSort(prev, key));
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return markets.filter((m) => {
      if (selectedAddresses.size > 0) {
        const c = m.collateralToken.address.toLowerCase();
        const l = m.loanToken.address.toLowerCase();
        if (!selectedAddresses.has(c) && !selectedAddresses.has(l)) {
          return false;
        }
      }
      if (q) {
        const haystack = `${m.id} ${m.collateralToken.symbol} ${m.loanToken.symbol}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [markets, query, selectedAddresses]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => compareMarkets(sort.key, a, b, avgRateById) * dir,
    );
  }, [filtered, sort, avgRateById]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedMarkets = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TokenFilterDropdown
          tokens={SUPPORTED_TOKENS}
          selectedAddresses={selectedAddresses}
          onToggle={toggleToken}
        />
        <Input
          placeholder="Search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          prefixSlot={<Search size={16} aria-hidden="true" />}
          aria-label="Search markets"
          className="!h-12 w-full sm:!h-11 sm:w-64"
        />
      </div>

      {marketsQuery.isLoading ? (
        <SkeletonTable rows={PAGE_SIZE} />
      ) : marketsQuery.isError ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-10 text-center">
          <AlertCircle
            size={20}
            className="mx-auto text-danger"
            aria-hidden="true"
          />
          <p className="mt-3 font-medium text-text-primary">
            Couldn&apos;t load markets
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {readableFetchError(marketsQuery.error)}
          </p>
          <button
            type="button"
            onClick={() => marketsQuery.refetch()}
            className="mt-4 inline-flex h-9 items-center rounded-md border border-border bg-bg px-4 text-sm font-medium text-text-primary transition-colors duration-base ease-out-expo hover:border-accent"
          >
            Retry
          </button>
        </div>
      ) : markets.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">
            No markets have been created yet.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">
            No markets match the current filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
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
                    label="LLTV"
                    sortKey="lltv"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Total Liquidity"
                    sortKey="liquidity"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Total Borrowed"
                    sortKey="borrowed"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Best Rate"
                    sortKey="rate"
                    sort={sort}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Avg Rate"
                    sortKey="avgRate"
                    sort={sort}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {pagedMarkets.map((market) => {
                  const d = depthByMarketId.get(market.id) ?? {
                    avgRate: null,
                    isPending: true,
                  };
                  return (
                    <MarketRow
                      key={market.id}
                      market={market}
                      avgRate={d.avgRate}
                      avgPending={d.isPending}
                      onClick={() =>
                        router.push(`/market/${getMarketSlug(market)}`)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-text-muted">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

// One row in the markets table. Receives the weighted-avg rate as a prop
// so the parent can use the same value for sorting; the depth fetches
// themselves are batched once in the parent via `useQueries`.
function MarketRow({
  market,
  avgRate,
  avgPending,
  onClick,
}: {
  market: Market;
  avgRate: number | null;
  avgPending: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer border-b border-border transition-[background,box-shadow] duration-base ease-out-expo last:border-b-0 hover:bg-bg-elevated hover:shadow-[inset_3px_0_0_0_var(--color-arb-cyan)]"
    >
      <td className="px-4 py-4">
        <TokenCell token={market.collateralToken} />
      </td>
      <td className="px-4 py-4">
        <TokenCell token={market.loanToken} />
      </td>
      <td className="px-4 py-4 tabular-nums text-text-primary">
        {formatPercent(market.lltv)}
      </td>
      <td className="px-4 py-4">
        <p className="font-medium tabular-nums text-text-primary">
          {formatCompact(market.totalSupplyAssets.amount)}{" "}
          {market.loanToken.symbol}
        </p>
        <p className="text-xs tabular-nums text-text-muted">
          {formatUsd(market.totalSupplyAssets.usd)}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium tabular-nums text-text-primary">
          {formatCompact(market.totalBorrowAssets.amount)}{" "}
          {market.loanToken.symbol}
        </p>
        <p className="text-xs tabular-nums text-text-muted">
          {formatUsd(market.totalBorrowAssets.usd)}
        </p>
      </td>
      <td className="px-4 py-4 text-right font-medium tabular-nums text-text-primary">
        {formatPercent(market.ratePerSecond)}
      </td>
      <td className="px-4 py-4 text-right font-medium tabular-nums text-text-secondary">
        {avgPending
          ? "…"
          : avgRate !== null
            ? formatPercent(avgRate)
            : "—"}
      </td>
    </tr>
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

function SkeletonTable({ rows }: { rows: number }) {
  const headers = [
    "Collateral",
    "Loan",
    "LLTV",
    "Total Liquidity",
    "Total Borrowed",
    "Best Rate",
    "Avg Rate",
  ];
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-bg-sunken text-xs tracking-wider text-text-muted">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 font-medium ${
                    i >= headers.length - 2 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                <td className="px-4 py-4">
                  <SkeletonBar widthClass="w-24" />
                </td>
                <td className="px-4 py-4">
                  <SkeletonBar widthClass="w-24" />
                </td>
                <td className="px-4 py-4">
                  <SkeletonBar widthClass="w-12" />
                </td>
                <td className="px-4 py-4">
                  <SkeletonBar widthClass="w-28" />
                </td>
                <td className="px-4 py-4">
                  <SkeletonBar widthClass="w-28" />
                </td>
                <td className="px-4 py-4 text-right">
                  <SkeletonBar widthClass="w-16 ml-auto" />
                </td>
                <td className="px-4 py-4 text-right">
                  <SkeletonBar widthClass="w-16 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkeletonBar({ widthClass }: { widthClass: string }) {
  return (
    <span
      aria-hidden
      className={`block h-3 animate-pulse rounded bg-bg-elevated ${widthClass}`}
    />
  );
}

function readableFetchError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Network error.";
}
