"use client";

import { useState } from "react";
import { MOCK_BORROWER_LOANS, type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";

export function BorrowerView() {
  const [loans, setLoans] = useState<BorrowerLoan[]>(MOCK_BORROWER_LOANS);

  const repay = async (id: string, amount: number) => {
    // Mock blockchain tx — replace with wagmi writeContract once wired.
    //
    // TODO (indexer-wire-up): rewrite as a `borrowShares` shrink. With real
    // data the loan no longer carries `principal` / `accruedInterest`; debt
    // is derived from `borrowShares × totalBorrowAssets / totalBorrowShares`
    // on the joined market. Repay reduces `borrowShares` proportionally
    // (`newShares = borrowShares × (1 - amount / currentDebt)`) and the
    // health factor recomputes from a live oracle price.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setLoans((prev) =>
      prev.flatMap((loan) => {
        if (loan.id !== id) return [loan];
        const debtAmount =
          loan.principal.amount + loan.accruedInterest.amount;
        // Full repay closes the loan.
        if (amount >= debtAmount - 1e-9) return [];
        // Partial repay shrinks the debt proportionally and lifts health.
        const ratio = (debtAmount - amount) / debtAmount;
        const newDebtUsd =
          (loan.principal.usd + loan.accruedInterest.usd) * ratio;
        return [
          {
            ...loan,
            borrowShares: loan.borrowShares * ratio,
            principal: {
              amount: loan.principal.amount * ratio,
              usd: loan.principal.usd * ratio,
            },
            accruedInterest: {
              amount: loan.accruedInterest.amount * ratio,
              usd: loan.accruedInterest.usd * ratio,
            },
            healthFactor:
              (loan.collateral.usd * loan.lltv) / newDebtUsd,
          },
        ];
      }),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <BorrowerSummary loans={loans} />
      <MyLoansCard loans={loans} onRepay={repay} />
    </div>
  );
}
