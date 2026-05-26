"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { healthBand, type BorrowerLoan } from "@/lib/borrower";
import type { Token } from "@/lib/tokens";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";

interface MyLoansCardProps {
  loans: BorrowerLoan[];
  onRepay: (id: string) => Promise<void>;
}

export function MyLoansCard({ loans, onRepay }: MyLoansCardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleRepay = async (id: string) => {
    setPendingId(id);
    try {
      await onRepay(id);
    } finally {
      setPendingId(null);
    }
  };

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
              <thead className="border-b border-border bg-bg-sunken text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Collateral
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Debt
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Rate
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Health
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const pending = pendingId === loan.id;
                  const debtAmount =
                    loan.principal.amount + loan.accruedInterest.amount;
                  const debtUsd = loan.principal.usd + loan.accruedInterest.usd;
                  return (
                    <tr
                      key={loan.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <AmountCell
                          token={loan.collateralToken}
                          amount={loan.collateralPosted.amount}
                          usd={loan.collateralPosted.usd}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <AmountCell
                          token={loan.loanToken}
                          amount={debtAmount}
                          usd={debtUsd}
                        />
                      </td>
                      <td className="px-4 py-4 font-medium tabular-nums text-text-primary">
                        {formatPercent(loan.rate)}
                      </td>
                      <td className="px-4 py-4">
                        <HealthBadge value={loan.healthFactor} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRepay(loan.id)}
                          disabled={pending}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 text-sm font-medium text-accent transition-colors duration-base ease-out-expo hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {pending ? "Confirming…" : "Repay"}
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
  amount: number;
  usd: number;
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
          {formatCompact(amount)} {token.symbol}
        </p>
        <p className="text-xs tabular-nums text-text-muted">
          {formatUsd(usd)}
        </p>
      </div>
    </div>
  );
}

function HealthBadge({ value }: { value: number }) {
  const band = healthBand(value);
  const variant = band === "safe" ? "success" : band === "warn" ? "warn" : "danger";
  return <Badge variant={variant}>{value.toFixed(2)}</Badge>;
}
