"use client";

import { useEffect, useRef, useState } from "react";
import { MOCK_BORROWER_LOANS, type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";
import { RepayModal } from "./RepayModal";
import { useRepay, type RepayItem } from "@/hooks/useBiviumRouterWrite";
import { annualRateToRatePerSecond } from "@/lib/utils";
import { toast } from "@/lib/toast";

/** Placeholder until the indexer wires real positions+markets joins through
 *  to the borrower view. The on-chain market id is keccak(MarketParams), so a
 *  zero oracle will hash to a non-existent market and the tx will revert —
 *  expected for mock-data UI until indexer integration. */
const ORACLE_PLACEHOLDER: `0x${string}` = `0x${"0".repeat(40)}`;

function toBaseUnits(amount: number, decimals: number): bigint {
  // Round before BigInt to absorb float imprecision on amounts like 0.1 * 1e18.
  return BigInt(Math.round(amount * 10 ** decimals));
}

/** TODO(indexer-wire-up): pull `oracle`, the bigint-typed `ratePerSecond` /
 *  `lltv`, and the properly-typed `creator` directly off the positions row
 *  joined to its market. Constructing MarketParams from mock fields here is
 *  enough to exercise the wallet → pending → success/error pipeline; the
 *  on-chain call will not match a real market until real data flows. */
function buildRepayItem(loan: BorrowerLoan, amount: number): RepayItem {
  const assets = toBaseUnits(amount, loan.loanToken.decimals);
  return {
    params: {
      loanToken: loan.loanToken.address,
      collateralToken: loan.collateralToken.address,
      oracle: ORACLE_PLACEHOLDER,
      ratePerSecond: annualRateToRatePerSecond(loan.ratePerSecond),
      lltv: BigInt(Math.round(loan.lltv * 1e18)),
      creator: loan.lender as `0x${string}`,
    },
    assets,
    shares: 0n,
    // For a repay the borrower is paying X tokens to reduce debt by X tokens —
    // no slippage to absorb. maxAssetsIn = assets is the tight cap.
    maxAssetsIn: assets,
  };
}

export function BorrowerView() {
  const [loans, setLoans] = useState<BorrowerLoan[]>(MOCK_BORROWER_LOANS);
  const [repayLoan, setRepayLoan] = useState<BorrowerLoan | null>(null);
  // Stash the amount across the async tx flow so the success effect can apply
  // the optimistic local shrink with the exact value the user signed for.
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
      // requireAddress("router") throws synchronously when the env var is
      // missing; viem also throws synchronously on malformed addresses.
      toast.error("Repay setup failed", {
        description: readableWriteError(
          err instanceof Error ? err : new Error("Unknown error"),
        ),
      });
    }
  };

  // Confirmation: commit the local shrink (same math as the prior mock flow)
  // and surface a result toast.
  useEffect(() => {
    if (!repayHook.isSuccess || !repayLoan) return;
    const loan = repayLoan;
    const amount = pendingAmountRef.current;
    const debtAmount = loan.principal.amount + loan.accruedInterest.amount;
    const closing = amount >= debtAmount - 1e-9;

    setLoans((prev) =>
      prev.flatMap((l) => {
        if (l.id !== loan.id) return [l];
        if (closing) return [];
        const ratio = (debtAmount - amount) / debtAmount;
        const newDebtUsd =
          (l.principal.usd + l.accruedInterest.usd) * ratio;
        return [
          {
            ...l,
            borrowShares: l.borrowShares * ratio,
            principal: {
              amount: l.principal.amount * ratio,
              usd: l.principal.usd * ratio,
            },
            accruedInterest: {
              amount: l.accruedInterest.amount * ratio,
              usd: l.accruedInterest.usd * ratio,
            },
            healthFactor: (l.collateral.usd * l.lltv) / newDebtUsd,
          },
        ];
      }),
    );

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
  }, [repayHook.isSuccess, repayLoan, repayHook]);

  useEffect(() => {
    if (!repayHook.error) return;
    pendingAmountRef.current = 0;
    toast.error("Repay failed", {
      description: readableWriteError(repayHook.error),
    });
    repayHook.reset();
  }, [repayHook.error, repayHook]);

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

function readableWriteError(err: Error): string {
  const anyErr = err as Error & { shortMessage?: string };
  return anyErr.shortMessage ?? err.message;
}
