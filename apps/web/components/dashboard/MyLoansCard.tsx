"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  nextSort,
  SortableHeader,
  type SortState,
} from "@/components/ui/SortableHeader";
import { Tooltip } from "@/components/ui/Tooltip";
import { healthBand, type BorrowerLoan } from "@/lib/borrower";
import type { Token } from "@/lib/tokens";
import {
  formatPercent,
  formatTokenBalance,
  formatUsd,
  ratePerSecondToAnnual,
} from "@/lib/utils";

interface MyLoansCardProps {
  loans: BorrowerLoan[];
  onSelectRepay: (loan: BorrowerLoan) => void;
  submitting: boolean;
}

type SortKey = "collateral" | "debt" | "rate" | "health";

function debtUsd(loan: BorrowerLoan): number {
  return (loan.principal.usd ?? 0) + (loan.accruedInterest.usd ?? 0);
}

function compare(key: SortKey, a: BorrowerLoan, b: BorrowerLoan): number {
  switch (key) {
    case "collateral":
      return (a.collateral.usd ?? 0) - (b.collateral.usd ?? 0);
    case "debt":
      return debtUsd(a) - debtUsd(b);
    case "rate":
      return a.ratePerSecond < b.ratePerSecond
        ? -1
        : a.ratePerSecond > b.ratePerSecond
          ? 1
          : 0;
    case "health":
      // Null sorts to the end (largest) ascending.
      return (
        (a.healthFactor ?? Number.POSITIVE_INFINITY) -
        (b.healthFactor ?? Number.POSITIVE_INFINITY)
      );
  }
}

export function MyLoansCard({
  loans,
  onSelectRepay,
  submitting,
}: MyLoansCardProps) {
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);

  const handleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const sorted = useMemo(() => {
    if (!sort) return loans;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...loans].sort((a, b) => compare(sort.key, a, b) * dir);
  }, [loans, sort]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Your loans</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Open positions. Repay to close and unlock collateral.
          </p>
        </div>
      </CardHeader>
      {loans.length === 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-4 py-12 text-center">
          <p className="text-text-secondary">No open loans.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-bg-sunken text-xs tracking-wider text-text-muted">
                <tr>
                  <SortableHeader
                    label="Collateral"
                    sortKey="collateral"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Debt"
                    sortKey="debt"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Rate"
                    sortKey="rate"
                    sort={sort}
                    onSort={handleSort}
                    suffix={
                      <Tooltip
                        side="bottom"
                        content="Annualised borrow rate (APY). On-chain, the lender sets a per-second rate; we render its annualised form for legibility."
                      />
                    }
                  />
                  <SortableHeader
                    label="Health"
                    sortKey="health"
                    sort={sort}
                    onSort={handleSort}
                    suffix={
                      <Tooltip
                        side="bottom"
                        content="Health factor = (collateral × LLTV) / debt. Above 1.5 is safe; between 1.2–1.5 is warning; below 1.0 is liquidatable."
                      />
                    }
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
                {sorted.map((loan) => {
                  const debtAmount =
                    loan.principal.amount + loan.accruedInterest.amount;
                  return (
                    <tr
                      key={loan.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <AmountCell
                          token={loan.collateralToken}
                          amount={loan.collateral.amount}
                          usd={loan.collateral.usd}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <AmountCell
                          token={loan.loanToken}
                          amount={debtAmount}
                          usd={debtUsd(loan)}
                        />
                      </td>
                      <td className="px-4 py-4 font-medium tabular-nums text-text-primary">
                        {formatPercent(ratePerSecondToAnnual(loan.ratePerSecond))}
                      </td>
                      <td className="px-4 py-4">
                        <HealthBadge value={loan.healthFactor} />
                      </td>
                      <td className="w-32 px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectRepay(loan)}
                          disabled={submitting}
                          className="inline-flex h-9 w-28 items-center justify-center gap-1.5 rounded-md border border-border bg-bg px-3 text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary disabled:pointer-events-none disabled:opacity-50"
                        >
                          Repay
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

    </Card>
  );
}

function AmountCell({
  token,
  amount,
  usd,
}: {
  token: Token;
  amount: bigint;
  usd: number | null;
}) {
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
      <div>
        <p className="font-medium tabular-nums text-text-primary">
          {formatTokenBalance(amount, token.decimals, { compact: true })}{" "}
          {token.symbol}
        </p>
        <p className="text-xs tabular-nums text-text-muted">
          {usd !== null ? formatUsd(usd) : "—"}
        </p>
      </div>
    </div>
  );
}

function HealthBadge({ value }: { value: number | null }) {
  if (value === null) return <Badge variant="neutral">—</Badge>;
  const band = healthBand(value);
  const variant =
    band === "safe" ? "success" : band === "warn" ? "warn" : "danger";
  return <Badge variant={variant}>{value.toFixed(2)}</Badge>;
}
