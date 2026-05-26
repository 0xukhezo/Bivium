"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { TokenFilterDropdown } from "@/components/market/TokenFilterDropdown";
import { SUPPORTED_TOKENS, type Token } from "@/lib/tokens";
import { MOCK_MARKETS, type Market } from "@/lib/markets";
import { cn, formatCompact, formatPercent, formatUsd } from "@/lib/utils";

const PAGE_SIZE = 10;

type SortKey =
  | "collateral"
  | "loan"
  | "lltv"
  | "liquidity"
  | "borrowed"
  | "rate";
type SortDirection = "asc" | "desc";
interface SortState {
  key: SortKey;
  direction: SortDirection;
}

function compareMarkets(key: SortKey, a: Market, b: Market): number {
  switch (key) {
    case "collateral":
      return a.collateralToken.symbol.localeCompare(b.collateralToken.symbol);
    case "loan":
      return a.loanToken.symbol.localeCompare(b.loanToken.symbol);
    case "lltv":
      return a.lltv - b.lltv;
    case "liquidity":
      return a.totalLiquidity.usd - b.totalLiquidity.usd;
    case "borrowed":
      return a.totalBorrowed.usd - b.totalBorrowed.usd;
    case "rate":
      return a.rate - b.rate;
  }
}

export function MarketTable() {
  const [query, setQuery] = useState("");
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(
    new Set(),
  );
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

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
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_MARKETS.filter((m) => {
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
  }, [query, selectedAddresses]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareMarkets(sort.key, a, b) * dir);
  }, [filtered, sort]);

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

      {sorted.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">
            No markets match the current filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border bg-bg-sunken text-xs uppercase tracking-wider text-text-muted">
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
                    label="Rate"
                    sortKey="rate"
                    sort={sort}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {pagedMarkets.map((market) => (
                  <tr
                    key={market.id}
                    className="border-b border-border transition-colors duration-base ease-out-expo last:border-b-0 hover:bg-bg-sunken/50"
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
                        {formatCompact(market.totalLiquidity.amount)}{" "}
                        {market.loanToken.symbol}
                      </p>
                      <p className="text-xs tabular-nums text-text-muted">
                        {formatUsd(market.totalLiquidity.usd)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium tabular-nums text-text-primary">
                        {formatCompact(market.totalBorrowed.amount)}{" "}
                        {market.loanToken.symbol}
                      </p>
                      <p className="text-xs tabular-nums text-text-muted">
                        {formatUsd(market.totalBorrowed.usd)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-medium tabular-nums text-text-primary">
                      {formatPercent(market.rate)}
                    </td>
                  </tr>
                ))}
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

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: SortableHeaderProps) {
  const active = sort?.key === sortKey;
  const direction = active ? sort?.direction : null;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors duration-base ease-out-expo hover:text-text-primary",
          align === "right" && "flex-row-reverse",
          active && "text-text-primary",
        )}
      >
        <span>{label}</span>
        {direction === "asc" ? (
          <ChevronUp size={14} aria-hidden="true" className="text-accent" />
        ) : direction === "desc" ? (
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="text-accent"
          />
        ) : (
          <ChevronsUpDown
            size={14}
            aria-hidden="true"
            className="opacity-40"
          />
        )}
      </button>
    </th>
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
