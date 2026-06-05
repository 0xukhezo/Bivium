"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import type { LenderMarket } from "@/lib/lender";

interface MarketStatusModalProps {
  market: LenderMarket | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function MarketStatusModal({
  market,
  open,
  onClose,
  onConfirm,
  submitting,
}: MarketStatusModalProps) {
  if (!market) return null;

  const pausing = market.status === "active";
  const title = pausing ? "Pause market" : "Resume market";
  const description = pausing
    ? "Pausing sets your rate for this loan token to 0 — borrowers can no longer draw new loans against it. Existing positions stay open and keep accruing interest. You can resume at any time."
    : "Resuming restores your rate for this loan token, reopening the market to new borrows against your liquidity.";

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title={title}>
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
        <ChainAwareButton
          variant="primary"
          size="md"
          className="flex-1"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting
            ? "Confirming…"
            : pausing
              ? "Pause market"
              : "Resume market"}
        </ChainAwareButton>
      </div>
    </Modal>
  );
}
