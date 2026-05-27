"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { LenderMarket } from "@/lib/lender";

interface MarketStatusModalProps {
  market: LenderMarket | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function MarketStatusModal({
  market,
  open,
  onClose,
  onConfirm,
}: MarketStatusModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!market) return null;

  const pausing = market.status === "active";
  const title = pausing ? "Pause market" : "Resume market";
  const description = pausing
    ? "Pausing stops new borrows from this market — borrowers will no longer be able to draw loans against it. Existing positions stay open and keep accruing interest. You can resume at any time."
    : "Resuming reopens this market — borrowers will be able to take new loans against your liquidity again.";

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(market.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-center gap-2 font-medium text-text-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={market.collateralToken.iconUrl}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="h-6 w-6 rounded-full object-contain"
        />
        <span>{market.collateralToken.symbol}</span>
        <span className="text-text-muted">/</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={market.loanToken.iconUrl}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="h-6 w-6 rounded-full object-contain"
        />
        <span>{market.loanToken.symbol}</span>
      </div>
      <p className="mt-3 text-sm text-text-secondary">{description}</p>
      <p className="mt-4 text-xs text-text-muted">
        This action requires a blockchain transaction.
      </p>
      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting
            ? "Confirming…"
            : pausing
              ? "Pause market"
              : "Resume market"}
        </Button>
      </div>
    </Modal>
  );
}
