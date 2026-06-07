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
import { humanizeError } from "@/lib/errors";
import { formatCompact, formatUsd } from "@/lib/utils";

interface RepayModalProps {
  loan: BorrowerLoan | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
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

  const {
    amount: walletBalance,
    isLoading: balanceLoading,
    isConnected,
  } = useTokenBalance(loan?.loanToken);

  // Loan-token allowance for the Router. Router pulls the repay amount
  // from msg.sender via ERC-20 `transferFrom`, so the user must approve
  // first or every real `repay()` reverts.
  const allowance = useTokenAllowance(loan?.loanToken, routerAddress);
  const approveHook = useApprove(loan?.loanToken, routerAddress);
  const approving = approveHook.isPending || approveHook.isConfirming;

  useEffect(() => {
    if (!approveHook.isSuccess) return;
    allowance.refetch();
    toast.success(
      loan ? `${loan.loanToken.symbol} approved` : "Token approved",
      {
        description: "The router can now pull funds to settle this repay.",
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

  const debtAmount = loan.principal.amount + loan.accruedInterest.amount;
  const debtUsd = loan.principal.usd + loan.accruedInterest.usd;
  const pricePerToken = debtAmount > 0 ? debtUsd / debtAmount : 0;

  const parsed = parseFloat(amountInput);
  const amount = Number.isNaN(parsed)
    ? 0
    : Math.min(Math.max(parsed, 0), debtAmount);
  const repayUsd = amount * pricePerToken;
  const exceedsBalance = amount > walletBalance + 1e-9;

  const remainingAmount = Math.max(debtAmount - amount, 0);
  const remainingUsd = Math.max(debtUsd - repayUsd, 0);

  const newHf =
    remainingUsd > 0
      ? (loan.collateral.usd * loan.lltv) / remainingUsd
      : Number.POSITIVE_INFINITY;

  const valid = amount > 0 && !exceedsBalance && !!routerAddress;

  const balanceKnown = isConnected && !balanceLoading;
  const insufficientForFull = balanceKnown && walletBalance < debtAmount - 1e-9;
  const isPartial = amount > 0 && amount < debtAmount - 1e-9;
  const remainderNotice = insufficientForFull
    ? "You don't have enough funds in your wallet to repay the full amount. If you proceed to repay with your current amount of funds, you will still have a small borrowing position in your dashboard."
    : isPartial
      ? "You're repaying only part of your debt, so a remaining borrowing position will stay open in your dashboard."
      : null;

  // Base-unit amount the Router will pull. Round UP by one base unit so
  // FP→bigint quantisation never under-approves and the repay reverts.
  const amountWei = (() => {
    if (amount <= 0) return 0n;
    try {
      const dust = 10 ** -loan.loanToken.decimals;
      return parseUnits(
        (amount + dust).toFixed(loan.loanToken.decimals),
        loan.loanToken.decimals,
      );
    } catch {
      return 0n;
    }
  })();

  const needsApproval =
    !!routerAddress &&
    amountWei > 0n &&
    !allowance.isLoading &&
    allowance.allowance < amountWei;

  const busy = submitting || approving;

  const setAmount = (value: number) =>
    setAmountInput(String(Math.round(value * 1e8) / 1e8));

  const handleMaxWallet = () => setAmount(Math.min(walletBalance, debtAmount));
  const handleMaxDebt = () => setAmount(debtAmount);

  const handleConfirm = () => {
    if (!valid || busy) return;
    if (needsApproval) {
      approveHook.approve(amountWei);
      return;
    }
    onConfirm(amount);
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={`Repay ${loan.loanToken.symbol}`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-sm text-text-secondary">Amount</label>
        <span className="text-xs tabular-nums text-text-muted">
          Debt {formatCompact(debtAmount)} {loan.loanToken.symbol}
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
            Wallet balance {balanceLoading ? "…" : formatCompact(walletBalance)}
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
              {formatCompact(debtAmount)} {loan.loanToken.symbol}
              <span className="text-text-muted"> → </span>
              {formatCompact(remainingAmount)} {loan.loanToken.symbol}
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
              : amount <= 0
                ? "Enter an amount"
                : exceedsBalance
                  ? "Insufficient balance"
                  : needsApproval
                    ? `Approve ${loan.loanToken.symbol}`
                    : `Repay ${loan.loanToken.symbol}`}
      </ChainAwareButton>
    </Modal>
  );
}
