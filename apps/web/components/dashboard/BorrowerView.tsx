"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";
import { RepayModal } from "./RepayModal";
import { useRepay, type RepayItem } from "@/hooks/useBiviumRouterWrite";
import { useBorrowerLoans } from "@/hooks/useBorrowerLoans";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import { useLiveHealthFactors } from "@/hooks/useLiveHealthFactors";
import { formatTokenBalance } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
import { humanizeError } from "@/lib/errors";

function buildRepayItem(loan: BorrowerLoan, assets: bigint): RepayItem {
  return {
    params: {
      loanToken: loan.loanToken.address,
      collateralToken: loan.collateralToken.address,
      oracle: loan.oracle,
      ratePerSecond: loan.ratePerSecond,
      lltv: loan.lltv,
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

  // Live HF per loan, re-derived from on-chain oracle prices every block.
  // Falls back to the indexer-derived `loan.healthFactor` whenever the
  // oracle read fails. Lifted to the parent so `BorrowerSummary` and
  // `MyLoansCard` share the same map (one batched read, not two).
  const liveHf = useLiveHealthFactors(loans);

  const [repayLoan, setRepayLoan] = useState<BorrowerLoan | null>(null);
  // Bigint base units of the pending repay, captured for the success toast.
  const pendingAmountRef = useRef<bigint>(0n);

  const repayHook = useRepay();
  const submitting = repayHook.isPending || repayHook.isConfirming;

  const startRepay = (amountWei: bigint) => {
    if (!repayLoan) return;
    try {
      const item = buildRepayItem(repayLoan, amountWei);
      pendingAmountRef.current = amountWei;
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
    const amountWei = pendingAmountRef.current;
    const debtAmount = loan.principal.amount + loan.accruedInterest.amount;
    const closing = amountWei >= debtAmount;

    const hash = repayHook.hash;
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
          : `${formatTokenBalance(amountWei, loan.loanToken.decimals, {
              maxDecimals: Math.min(loan.loanToken.decimals, 6),
            })} ${loan.loanToken.symbol} returned to lender.`,
        action: txAction(hash),
      },
    );

    setRepayLoan(null);
    pendingAmountRef.current = 0n;
    repayHook.reset();
  }, [repayHook.isSuccess, repayLoan, repayHook, query, queryClient]);

  useEffect(() => {
    if (!repayHook.error) return;
    pendingAmountRef.current = 0n;
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
      <BorrowerSummary loans={loans} liveHfById={liveHf.byId} />
      <MyLoansCard
        loans={loans}
        liveHfById={liveHf.byId}
        onSelectRepay={setRepayLoan}
        submitting={submitting}
      />
      <RepayModal
        loan={repayLoan}
        currentHf={
          repayLoan
            ? (liveHf.byId.get(repayLoan.id) ?? repayLoan.healthFactor)
            : null
        }
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

