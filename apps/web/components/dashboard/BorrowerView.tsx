"use client";

import { useState } from "react";
import { MOCK_BORROWER_LOANS, type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";

export function BorrowerView() {
  const [loans, setLoans] = useState<BorrowerLoan[]>(MOCK_BORROWER_LOANS);

  const repay = async (id: string, amount: number) => {
    // Mock blockchain tx — replace with wagmi writeContract once wired.
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
            principal: {
              amount: loan.principal.amount * ratio,
              usd: loan.principal.usd * ratio,
            },
            accruedInterest: {
              amount: loan.accruedInterest.amount * ratio,
              usd: loan.accruedInterest.usd * ratio,
            },
            healthFactor:
              (loan.collateralPosted.usd * loan.lltv) / newDebtUsd,
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
