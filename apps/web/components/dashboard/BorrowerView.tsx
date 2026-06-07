"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { Card } from "@/components/ui/Card";
import { type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";
import { RepayModal } from "./RepayModal";
import { useRepay, type RepayItem } from "@/hooks/useBiviumRouterWrite";
import { useBorrowerLoans } from "@/hooks/useBorrowerLoans";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import { annualRateToRatePerSecond } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";

function buildRepayItem(loan: BorrowerLoan, amount: number): RepayItem {
  // parseUnits handles decimal→base-unit conversion safely (no FP noise).
  const assets = parseUnits(amount.toString(), loan.loanToken.decimals);
  return {
    params: {
      loanToken: loan.loanToken.address,
      collateralToken: loan.collateralToken.address,
      oracle: loan.oracle,
      ratePerSecond: annualRateToRatePerSecond(loan.ratePerSecond),
      lltv: BigInt(Math.round(loan.lltv * 1e18)),
      creator: loan.lender as `0x${string}`,
    },
    assets,
    shares: 0n,
    maxAssetsIn: assets,
  };
}

export function BorrowerView() {
  const address = useEmbeddedAddress();
  const query = useBorrowerLoans(address);
  const queryClient = useQueryClient();
  const loans = useMemo(() => query.data ?? [], [query.data]);

  const [repayLoan, setRepayLoan] = useState<BorrowerLoan | null>(null);
  const pendingAmountRef = useRef<number>(0);

  const repayHook = useRepay();
  const submitting = repayHook.isPending || repayHook.isConfirming;

  const startRepay = (amount: number) => {
    if (!repayLoan) return;
    try {
      const item = buildRepayItem(repayLoan, amount);
      pendingAmountRef.current = amount;
      repayHook.repay([item]);
    } catch (err) {
      toast.error("Repay setup failed", {
        description: humanizeError(
          err instanceof Error ? err : new Error("Unknown error"),
        ),
      });
    }
  };

  useEffect(() => {
    if (!repayHook.isSuccess || !repayLoan) return;
    const loan = repayLoan;
    const amount = pendingAmountRef.current;
    const debtAmount = loan.principal.amount + loan.accruedInterest.amount;
    const closing = amount >= debtAmount - 1e-9;

    // Refetch from indexer instead of optimistic mutation — the indexer is
    // the source of truth for borrowShares, debtAmount, and healthFactor.
    query.refetch();
    // Closing/reducing a position changes lender depth + market totals, so
    // invalidate those caches too. The dashboard markets card and the
    // /market/[pair] depth chart will pick up the change on next render.
    queryClient.invalidateQueries({ queryKey: ["market-depth"] });
    queryClient.invalidateQueries({ queryKey: ["markets"] });

    toast.success(
      closing ? `${loan.loanToken.symbol} loan closed` : "Loan repaid",
      {
        description: closing
          ? "Collateral unlocked."
          : `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${loan.loanToken.symbol} returned to lender.`,
      },
    );

    setRepayLoan(null);
    pendingAmountRef.current = 0;
    repayHook.reset();
  }, [repayHook.isSuccess, repayLoan, repayHook, query, queryClient]);

  useEffect(() => {
    if (!repayHook.error) return;
    pendingAmountRef.current = 0;
    toast.error("Repay failed", {
      description: humanizeError(repayHook.error),
    });
    repayHook.reset();
  }, [repayHook.error, repayHook]);

  if (query.isPending) {
    return (
      <Card className="flex items-center justify-center py-16">
        <p className="text-text-secondary">Loading your loans…</p>
      </Card>
    );
  }
  if (query.isError) {
    return (
      <Card className="flex items-center justify-center border-danger/30 bg-danger/10 py-16">
        <p className="text-sm text-text-secondary">
          Couldn&apos;t load your loans. {humanizeError(query.error)}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BorrowerSummary loans={loans} />
      <MyLoansCard
        loans={loans}
        onSelectRepay={setRepayLoan}
        submitting={submitting}
      />
      <RepayModal
        loan={repayLoan}
        open={repayLoan !== null}
        onClose={() => {
          if (submitting) return;
          setRepayLoan(null);
        }}
        onConfirm={startRepay}
        submitting={submitting}
      />
    </div>
  );
}

