"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";
import { RepayModal } from "./RepayModal";
import {
  useClosePosition,
  useRepay,
  type ClosePositionItem,
  type MarketParams,
  type RepayItem,
} from "@/hooks/useBiviumRouterWrite";
import { useBorrowerLoans } from "@/hooks/useBorrowerLoans";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import { formatTokenBalance } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
import { humanizeError } from "@/lib/errors";

function paramsOf(loan: BorrowerLoan): MarketParams {
  return {
    loanToken: loan.loanToken.address,
    collateralToken: loan.collateralToken.address,
    oracle: loan.oracle,
    ratePerSecond: loan.ratePerSecond,
    lltv: loan.lltv,
    creator: loan.lender as `0x${string}`,
  };
}

function buildRepayItem(loan: BorrowerLoan, assets: bigint): RepayItem {
  return {
    params: paramsOf(loan),
    assets,
    shares: 0n,
    maxAssetsIn: assets,
  };
}

// Closes the whole position in one tx: repays in shares-mode (so the
// debt zeroes regardless of interest that accrued between the indexer
// read and execution) and withdraws all collateral. `maxAssetsIn` caps
// the loan-token pull; it must be at least the user's approved
// allowance.
function buildClosePositionItem(
  loan: BorrowerLoan,
  maxAssetsIn: bigint,
): ClosePositionItem {
  return {
    params: paramsOf(loan),
    assets: 0n,
    shares: loan.borrowShares,
    maxAssetsIn,
    collateralAmount: loan.collateral.amount,
  };
}

export function BorrowerView() {
  const address = useEmbeddedAddress();
  const query = useBorrowerLoans(address);
  const queryClient = useQueryClient();
  const loans = useMemo(() => query.data ?? [], [query.data]);

  const [repayLoan, setRepayLoan] = useState<BorrowerLoan | null>(null);
  // Bigint base units of the pending repay, captured for the success toast.
  const pendingAmountRef = useRef<bigint>(0n);

  const repayHook = useRepay();
  const closeHook = useClosePosition();
  const submitting =
    repayHook.isPending ||
    repayHook.isConfirming ||
    closeHook.isPending ||
    closeHook.isConfirming;

  const startRepay = (amountWei: bigint) => {
    if (!repayLoan) return;
    const debtAmount =
      repayLoan.principal.amount + repayLoan.accruedInterest.amount;
    // Treat "user repays the indexer-reported debt or more" as a close.
    // The Router walks the shares-mode path so the small amount of
    // interest accrued between indexer snapshot and execution is folded
    // in automatically.
    const closing = amountWei >= debtAmount;
    try {
      pendingAmountRef.current = amountWei;
      if (closing) {
        closeHook.closePosition([buildClosePositionItem(repayLoan, amountWei)]);
      } else {
        repayHook.repay([buildRepayItem(repayLoan, amountWei)]);
      }
    } catch (err) {
      toast.error("Repay setup failed", {
        description: humanizeError(
          err instanceof Error ? err : new Error("Unknown error"),
        ),
      });
    }
  };

  // Shared post-success handler for both repay and closePosition. The
  // toast wording flips on whether the position was closed (collateral
  // unlocked) or only partially repaid.
  const lastHash = repayHook.isSuccess
    ? repayHook.hash
    : closeHook.isSuccess
      ? closeHook.hash
      : undefined;
  const lastSuccess = repayHook.isSuccess || closeHook.isSuccess;

  useEffect(() => {
    if (!lastSuccess || !repayLoan) return;
    const loan = repayLoan;
    const amountWei = pendingAmountRef.current;
    const debtAmount = loan.principal.amount + loan.accruedInterest.amount;
    const closing = amountWei >= debtAmount;

    // Refetch from indexer instead of optimistic mutation — the indexer is
    // the source of truth for borrowShares, debtAmount, and healthFactor.
    query.refetch();
    queryClient.invalidateQueries({ queryKey: ["market-depth"] });
    queryClient.invalidateQueries({ queryKey: ["markets"] });

    toast.success(
      closing ? `${loan.loanToken.symbol} loan closed` : "Loan repaid",
      {
        description: closing
          ? `Collateral unlocked — ${formatTokenBalance(loan.collateral.amount, loan.collateralToken.decimals, { maxDecimals: Math.min(loan.collateralToken.decimals, 8) })} ${loan.collateralToken.symbol} returned to your wallet.`
          : `${formatTokenBalance(amountWei, loan.loanToken.decimals, {
              maxDecimals: Math.min(loan.loanToken.decimals, 6),
            })} ${loan.loanToken.symbol} returned to lender.`,
        action: txAction(lastHash),
      },
    );

    setRepayLoan(null);
    pendingAmountRef.current = 0n;
    repayHook.reset();
    closeHook.reset();
  }, [lastSuccess, lastHash, repayLoan, repayHook, closeHook, query, queryClient]);

  useEffect(() => {
    const err = repayHook.error ?? closeHook.error;
    if (!err) return;
    pendingAmountRef.current = 0n;
    toast.error("Repay failed", {
      description: humanizeError(err),
    });
    repayHook.reset();
    closeHook.reset();
  }, [repayHook.error, closeHook.error, repayHook, closeHook]);

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
        currentHf={repayLoan?.healthFactor ?? null}
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

