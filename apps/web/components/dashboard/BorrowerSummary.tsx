"use client";

import { useMemo } from "react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { healthBand, type BorrowerLoan } from "@/lib/borrower";
import { cn, formatUsd } from "@/lib/utils";

interface BorrowerSummaryProps {
  loans: BorrowerLoan[];
}

export function BorrowerSummary({ loans }: BorrowerSummaryProps) {
  const stats = useMemo(() => {
    const totalDebt = loans.reduce(
      (acc, l) => acc + (l.principal.usd ?? 0) + (l.accruedInterest.usd ?? 0),
      0,
    );
    const totalCollateral = loans.reduce(
      (acc, l) => acc + (l.collateral.usd ?? 0),
      0,
    );
    const hfValues = loans
      .map((l) => l.healthFactor)
      .filter((v): v is number => v !== null);
    const lowestHf = hfValues.length === 0 ? null : Math.min(...hfValues);
    return { totalDebt, totalCollateral, lowestHf };
  }, [loans]);

  const hfColor =
    stats.lowestHf === null
      ? "text-text-muted"
      : healthBand(stats.lowestHf) === "safe"
        ? "text-success"
        : healthBand(stats.lowestHf) === "warn"
          ? "text-warn"
          : "text-danger";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardLabel>Total borrowed</CardLabel>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
          {formatUsd(stats.totalDebt)}
        </p>
      </Card>
      <Card>
        <CardLabel>Total collateral</CardLabel>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
          {formatUsd(stats.totalCollateral)}
        </p>
      </Card>
      <Card>
        <span className="flex items-center gap-1.5">
          <CardLabel>Lowest health factor</CardLabel>
          <Tooltip
            side="top"
            content="The riskiest position across all your loans. HF = (collateral × LLTV) / debt; below 1.0 the position is liquidatable."
          />
        </span>
        <p className={cn("mt-2 text-2xl font-semibold tabular-nums", hfColor)}>
          {stats.lowestHf === null ? "—" : stats.lowestHf.toFixed(2)}
        </p>
      </Card>
    </div>
  );
}
