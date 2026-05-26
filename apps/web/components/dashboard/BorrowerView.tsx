"use client";

import { useState } from "react";
import { MOCK_BORROWER_LOANS, type BorrowerLoan } from "@/lib/borrower";
import { BorrowerSummary } from "./BorrowerSummary";
import { MyLoansCard } from "./MyLoansCard";

export function BorrowerView() {
  const [loans, setLoans] = useState<BorrowerLoan[]>(MOCK_BORROWER_LOANS);

  const repay = async (id: string) => {
    // Mock blockchain tx — replace with wagmi writeContract once wired.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setLoans((prev) => prev.filter((loan) => loan.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <BorrowerSummary loans={loans} />
      <MyLoansCard loans={loans} onRepay={repay} />
    </div>
  );
}
