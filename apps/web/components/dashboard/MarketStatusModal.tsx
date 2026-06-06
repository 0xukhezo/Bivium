"use client";

import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import type { LenderMarket } from "@/lib/lender";

interface MarketStatusModalProps {
  market: LenderMarket | null;
  /** Current global paused state read from `BiviumProfile.paused`. */
  isPaused: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function MarketStatusModal({
  market,
  isPaused,
  open,
  onClose,
  onConfirm,
  submitting,
}: MarketStatusModalProps) {
  if (!market) return null;

  // Pausing is *the act of pausing*: only meaningful when we're currently
  // active. If `isPaused`, the only action available is Resume.
  const pausing = !isPaused;
  const title = pausing ? "Pause your markets" : "Resume your markets";
  const description = pausing
    ? "Pausing flips the global `paused` flag on your BiviumProfile. New borrows stop across every market you run; existing positions stay open and keep accruing interest. Your rates and accepted-collateral list are preserved."
    : "Resuming clears the global `paused` flag on your BiviumProfile. Every market you run reopens to new borrows at the rates already on file.";

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

      <div className="mt-4 flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-text-secondary">
        <TriangleAlert
          size={16}
          className="mt-0.5 shrink-0 text-warn"
          aria-hidden="true"
        />
        <p>
          This affects <span className="font-semibold">all</span> your markets,
          not just {market.collateralToken.symbol} /{" "}
          {market.loanToken.symbol}. The contract only exposes a profile-wide
          pause today.
        </p>
      </div>

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
              ? "Pause profile"
              : "Resume profile"}
        </ChainAwareButton>
      </div>
    </Modal>
  );
}
