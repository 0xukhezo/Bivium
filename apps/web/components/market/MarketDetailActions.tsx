"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BorrowModal } from "./BorrowModal";
import type { Market } from "@/lib/markets";

interface MarketDetailActionsProps {
  market: Market;
}

export function MarketDetailActions({ market }: MarketDetailActionsProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Borrow {market.loanToken.symbol}
      </Button>
      <BorrowModal
        market={market}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
