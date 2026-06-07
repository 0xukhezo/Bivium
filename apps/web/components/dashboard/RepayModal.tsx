"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { parseUnits } from "viem";
import { Modal } from "@/components/ui/Modal";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import { healthBand, type BorrowerLoan } from "@/lib/borrower";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useApprove } from "@/hooks/useApprove";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
import { humanizeError } from "@/lib/errors";
import {
  baseUnitsToNumber,
  fixedPointToFraction,
  formatTokenBalance,
  formatUsd,
} from "@/lib/utils";

interface RepayModalProps {
  loan: BorrowerLoan | null;
  open: boolean;
  onClose: () => void;
  /** Called with the base-units bigint the user wants to repay. */
  onConfirm: (amountWei: bigint) => void;
  submitting: boolean;
}

function hfColor(hf: number | null): string {
  if (hf === null) return "text-text-muted";
  if (!Number.isFinite(hf) || healthBand(hf) === "safe") return "text-success";
  return healthBand(hf) === "warn" ? "text-warn" : "text-danger";
}

function formatHf(hf: number | null): string {
  if (hf === null) return "—";
  return Number.isFinite(hf) ? hf.toFixed(2) : "∞";
}

export function RepayModal({
  loan,
  open,
  onClose,
  onConfirm,
  submitting,
}: RepayModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const routerAddress = CONTRACT_ADDRESSES.router;

  useEffect(() => {
    if (open) setAmountInput("");
  }, [open, loan?.id]);

  const balance = useTokenBalance(loan?.loanToken);

  // Loan-token allowance for the Router. Router pulls the repay amount
  // from msg.sender via ERC-20 `transferFrom`, so the user must approve
  // first or every real `repay()` reverts.
  const allowance = useTokenAllowance(loan?.loanToken, routerAddress);
  const approveHook = useApprove(loan?.loanToken, routerAddress);
  const approving = approveHook.isPending || approveHook.isConfirming;

  useEffect(() => {
    if (!approveHook.isSuccess) return;
    const hash = approveHook.hash;
    allowance.refetch();
    toast.success(
      loan ? `${loan.loanToken.symbol} approved` : "Token approved",
      {
        description: "The router can now pull funds to settle this repay.",
        action: txAction(hash),
      },
    );
    approveHook.reset();
  }, [approveHook.isSuccess, approveHook, allowance, loan]);

  useEffect(() => {
    if (!approveHook.error) return;
    toast.error("Approval failed", {
      description: humanizeError(approveHook.error),
    });
    approveHook.reset();
  }, [approveHook.error, approveHook]);

  if (!loan) return null;

  const decimals = loan.loanToken.decimals;
  const debtAmountWei = loan.principal.amount + loan.accruedInterest.amount;
  const debtAmountFloat = baseUnitsToNumber(debtAmountWei, decimals);
  const debtUsd = (loan.principal.usd ?? 0) + (loan.accruedInterest.usd ?? 0);
  const pricePerToken =
    debtAmountFloat > 0 ? debtUsd / debtAmountFloat : 0;

  // Parse user input into a base-units bigint; clamp to debt. Keep a
  // float copy for HF projection + USD math.
  const amountWei = (() => {
    const parsed = parseFloat(amountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0n;
    try {
      const padded = parsed.toFixed(decimals);
      const raw = parseUnits(padded, decimals);
      return raw > debtAmountWei ? debtAmountWei : raw;
    } catch {
      return 0n;
    }
  })();
  const amountFloat = baseUnitsToNumber(amountWei, decimals);
  const repayUsd = amountFloat * pricePerToken;

  const exceedsBalance = amountWei > balance.raw;

  const remainingWei = debtAmountWei - amountWei;
  const remainingFloat = baseUnitsToNumber(remainingWei, decimals);
  const remainingUsd = Math.max(debtUsd - repayUsd, 0);

  const collateralUsd = loan.collateral.usd ?? 0;
  const lltvFraction = fixedPointToFraction(loan.lltv);
  const newHf =
    remainingUsd > 0
      ? (collateralUsd * lltvFraction) / remainingUsd
      : Number.POSITIVE_INFINITY;

  const valid = amountWei > 0n && !exceedsBalance && !!routerAddress;

  const balanceKnown = balance.isConnected && !balance.isLoading;
  const insufficientForFull =
    balanceKnown && balance.raw < debtAmountWei;
  const isPartial = amountWei > 0n && amountWei < debtAmountWei;
  const remainderNotice = insufficientForFull
    ? "You don't have enough funds in your wallet to repay the full amount. If you proceed to repay with your current amount of funds, you will still have a small borrowing position in your dashboard."
    : isPartial
      ? "You're repaying only part of your debt, so a remaining borrowing position will stay open in your dashboard."
      : null;

  const needsApproval =
    !!routerAddress &&
    amountWei > 0n &&
    !allowance.isLoading &&
    allowance.allowance < amountWei;

  const busy = submitting || approving;

  // Set the input field from a base-units bigint by rendering its float
  // form. Display loses precision past ~6 dp but the input is just a UX
  // affordance; the bigint stays the source of truth.
  const setAmountFromWei = (wei: bigint) => {
    setAmountInput(baseUnitsToNumber(wei, decimals).toString());
  };

  const handleMaxWallet = () => {
    const max = balance.raw < debtAmountWei ? balance.raw : debtAmountWei;
    setAmountFromWei(max);
  };
  const handleMaxDebt = () => setAmountFromWei(debtAmountWei);

  const handleConfirm = () => {
    if (!valid || busy) return;
    if (needsApproval) {
      approveHook.approve(amountWei);
      return;
    }
    onConfirm(amountWei);
  };

  const tokenFmt = (wei: bigint) =>
    formatTokenBalance(wei, decimals, {
      maxDecimals: Math.min(decimals, 6),
      compact: true,
    });

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={`Repay ${loan.loanToken.symbol}`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-sm text-text-secondary">Amount</label>
        <span className="text-xs tabular-nums text-text-muted">
          Debt {tokenFmt(debtAmountWei)} {loan.loanToken.symbol}
          <button
            type="button"
            onClick={handleMaxDebt}
            className="ml-2 font-semibold text-accent transition-colors duration-base ease-out-expo hover:text-accent-hover"
          >
            MAX
          </button>
        </span>
      </div>
      <div className="rounded-md border border-border bg-bg p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d*$/.test(v)) setAmountInput(v);
            }}
            aria-label={`Amount to repay in ${loan.loanToken.symbol}`}
            className="w-full bg-transparent text-2xl font-medium tabular-nums text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <div className="flex shrink-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loan.loanToken.iconUrl}
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-contain"
            />
            <span className="font-semibold text-text-primary">
              {loan.loanToken.symbol}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
          <span className="tabular-nums">{formatUsd(repayUsd)}</span>
          <span className="tabular-nums">
            Wallet balance{" "}
            {balance.isLoading ? "…" : tokenFmt(balance.raw)}
            <button
              type="button"
              onClick={handleMaxWallet}
              className="ml-2 font-semibold text-accent transition-colors duration-base ease-out-expo hover:text-accent-hover"
            >
              MAX
            </button>
          </span>
        </div>
      </div>

      {remainderNotice ? (
        <div className="mt-3 flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-text-secondary">
          <TriangleAlert
            size={16}
            className="mt-0.5 shrink-0 text-warn"
            aria-hidden="true"
          />
          <p>{remainderNotice}</p>
        </div>
      ) : null}

      <p className="mb-2 mt-4 text-sm text-text-secondary">
        Transaction overview
      </p>
      <div className="rounded-md border border-border bg-bg px-3">
        <div className="flex items-start justify-between gap-4 py-3">
          <span className="text-text-secondary">Remaining debt</span>
          <div className="text-right">
            <p className="font-medium tabular-nums text-text-primary">
              {tokenFmt(debtAmountWei)} {loan.loanToken.symbol}
              <span className="text-text-muted"> → </span>
              {tokenFmt(remainingWei)} {loan.loanToken.symbol}
            </p>
            <p className="text-xs tabular-nums text-text-muted">
              {formatUsd(debtUsd)} → {formatUsd(remainingUsd)}
            </p>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 border-t border-border py-3">
          <span className="text-text-secondary">Health factor</span>
          <div className="text-right">
            <p className="font-medium tabular-nums">
              <span className={hfColor(loan.healthFactor)}>
                {formatHf(loan.healthFactor)}
              </span>
              <span className="text-text-muted"> → </span>
              <span className={hfColor(newHf)}>{formatHf(newHf)}</span>
            </p>
            <p className="text-xs text-text-muted">Liquidation at &lt;1.0</p>
          </div>
        </div>
      </div>

      <ChainAwareButton
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        onClick={handleConfirm}
        disabled={!valid || busy}
      >
        {!routerAddress
          ? "Router not configured"
          : approving
            ? approveHook.isConfirming
              ? "Confirming approval…"
              : "Sign approval…"
            : submitting
              ? "Confirming…"
              : amountWei === 0n
                ? "Enter an amount"
                : exceedsBalance
                  ? "Insufficient balance"
                  : needsApproval
                    ? `Approve ${loan.loanToken.symbol}`
                    : `Repay ${loan.loanToken.symbol}`}
      </ChainAwareButton>
    </Modal>
  );
  // remainingFloat is computed for future inline previews; keep so the
  // calculation chain stays explicit.
  void remainingFloat;
}
