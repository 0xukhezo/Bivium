"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { parseUnits } from "viem";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import { BorrowFlowSankey, type BorrowFill } from "./BorrowFlowSankey";
import type { Market } from "@/lib/markets";
import type { DepthStep } from "@/lib/api/market-depth";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { useMarketDepth } from "@/hooks/useMarketDepth";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useApprove } from "@/hooks/useApprove";
import { useBorrow, type BorrowOrder } from "@/hooks/useBiviumRouterWrite";
import { toast } from "@/lib/toast";
import { txAction } from "@/lib/explorer";
import { humanizeError } from "@/lib/errors";
import {
  annualRateToRatePerSecond,
  baseUnitsToNumber,
  cn,
  fixedPointToFraction,
  formatPercent,
  formatTokenAmount,
  formatUsd,
} from "@/lib/utils";

interface BorrowModalProps {
  market: Market;
  open: boolean;
  onClose: () => void;
}

const HF_MIN = 1.1;
const HF_MAX = 5;
const HF_STEP = 0.1;
const HF_DEFAULT = 1.5;

const SLIPPAGE_DEFAULT = "1"; // % over the best book rate

export function BorrowModal({ market, open, onClose }: BorrowModalProps) {
  const { loanToken, collateralToken } = market;
  const lltv = fixedPointToFraction(market.lltv);
  const queryClient = useQueryClient();
  const routerAddress = CONTRACT_ADDRESSES.router;

  const [amountInput, setAmountInput] = useState("");
  const [hf, setHf] = useState(HF_DEFAULT);
  const [slippageInput, setSlippageInput] = useState(SLIPPAGE_DEFAULT);

  useEffect(() => {
    if (open) {
      setAmountInput("");
      setHf(HF_DEFAULT);
      setSlippageInput(SLIPPAGE_DEFAULT);
    }
  }, [open]);

  // Real orderbook depth: pre-sorted steps from the indexer (cheapest
  // rate first), one per lender qualifying for this pair.
  const depthQuery = useMarketDepth(
    collateralToken.address,
    loanToken.address,
  );
  const steps = useMemo<DepthStep[]>(
    () => depthQuery.data?.steps ?? [],
    [depthQuery.data],
  );

  // Real USD prices come through `Market.loanPriceUsd` /
  // `Market.collateralPriceUsd` from the indexer-curated `tokens` table.
  // Fall back to 0 only when a price is missing — the dependent UI shows
  // `$0.00` rather than a fake number.
  const loanPrice = market.loanPriceUsd ?? 0;
  const collateralPrice = market.collateralPriceUsd ?? 0;

  // User's real on-chain collateral balance via ERC20.balanceOf — used as
  // the ceiling for MAX and the insufficient-collateral guard. We
  // deliberately don't read the loan-token balance: in a borrow flow the
  // useful "balance" reference is the available orderbook depth, not how
  // much of the loan token the user happens to hold.
  const collateralBalance = useTokenBalance(collateralToken);

  // Total fillable depth across all lenders. Bigint is the source of
  // truth; the float copy is used by the input clamp + MAX math + display.
  const availableDepthWei = depthQuery.data?.totalAvailable ?? 0n;
  const availableDepth = baseUnitsToNumber(
    availableDepthWei,
    loanToken.decimals,
  );

  const maxBorrowFromCollateral = useMemo(() => {
    if (
      collateralPrice <= 0 ||
      loanPrice <= 0 ||
      hf <= 0 ||
      lltv <= 0 ||
      collateralBalance.amount <= 0
    ) {
      return 0;
    }
    return (collateralBalance.amount * collateralPrice * lltv) / (hf * loanPrice);
  }, [collateralBalance.amount, collateralPrice, loanPrice, hf, lltv]);

  // Effective ceiling for MAX — whichever runs out first: the lenders'
  // available depth, or what the user's collateral can back.
  const maxBorrowEffective = useMemo(() => {
    if (maxBorrowFromCollateral <= 0) return 0;
    if (availableDepth <= 0) return 0;
    return Math.min(maxBorrowFromCollateral, availableDepth);
  }, [maxBorrowFromCollateral, availableDepth]);

  const requested = parseFloat(amountInput);
  const requestedSafe =
    Number.isFinite(requested) && requested > 0 ? requested : 0;
  const slippagePct = parseFloat(slippageInput);
  const slippageSafe = Number.isFinite(slippagePct) && slippagePct >= 0
    ? slippagePct
    : 0;

  // Walk the real depth top-down (cheapest first), filling `requestedSafe`
  // from each lender's size until the borrow is satisfied or we run out.
  const walk = useMemo(
    () => walkDepth(steps, requestedSafe, loanToken.decimals),
    [steps, requestedSafe, loanToken.decimals],
  );

  const borrowUsd = requestedSafe * loanPrice;
  const requiredCollateralUsd = lltv > 0 ? (hf * borrowUsd) / lltv : 0;
  const requiredCollateralAmount =
    collateralPrice > 0 ? requiredCollateralUsd / collateralPrice : 0;

  const exceedsCollateral =
    requestedSafe > 0 &&
    maxBorrowFromCollateral > 0 &&
    requestedSafe > maxBorrowFromCollateral + 1e-9;

  const exceedsDepth =
    requestedSafe > 0 &&
    availableDepth > 0 &&
    requestedSafe > availableDepth + 1e-9;

  // True when the user simply doesn't hold enough of the collateral token
  // to cover the required deposit. Distinct from `exceedsCollateral`
  // (which says "borrow too large for the value of your collateral at HF").
  // Wait for the balance read to resolve before flagging — otherwise the
  // alert flashes while wagmi fetches.
  const insufficientCollateralBalance =
    !collateralBalance.isLoading &&
    requiredCollateralAmount > 0 &&
    collateralBalance.amount + 1e-9 < requiredCollateralAmount;

  const maxAvgRate = walk.bestRate * (1 + slippageSafe / 100);

  const slippageExceeded =
    requestedSafe > 0 && walk.weightedAvgRate > maxAvgRate + 1e-9;

  // Base-unit conversions for the on-chain call. `parseUnits` handles
  // decimals safely; we round up the collateral so the Router's required
  // amount is fully covered after FP-to-bigint quantisation.
  const loanAmountWei = useMemo(() => {
    if (requestedSafe <= 0) return 0n;
    try {
      return parseUnits(requestedSafe.toString(), loanToken.decimals);
    } catch {
      return 0n;
    }
  }, [requestedSafe, loanToken.decimals]);
  const collateralAmountWei = useMemo(() => {
    if (requiredCollateralAmount <= 0) return 0n;
    try {
      // Round up to next base unit so quantisation never under-collateralises.
      const dust = 10 ** -collateralToken.decimals;
      return parseUnits(
        (requiredCollateralAmount + dust).toFixed(collateralToken.decimals),
        collateralToken.decimals,
      );
    } catch {
      return 0n;
    }
  }, [requiredCollateralAmount, collateralToken.decimals]);

  // Allowance + write hooks. Approve uses ERC-20 `approve(router, amount)`;
  // borrow uses `BiviumRouter.borrow(BorrowOrder)`.
  const allowance = useTokenAllowance(collateralToken, routerAddress);
  const approveHook = useApprove(collateralToken, routerAddress);
  const borrowHook = useBorrow();

  const approving = approveHook.isPending || approveHook.isConfirming;
  const borrowing = borrowHook.isPending || borrowHook.isConfirming;
  const submitting = approving || borrowing;

  const needsApproval =
    collateralAmountWei > 0n && allowance.allowance < collateralAmountWei;

  const valid =
    requestedSafe > 0 &&
    walk.fills.length > 0 &&
    !slippageExceeded &&
    !exceedsCollateral &&
    !exceedsDepth &&
    !insufficientCollateralBalance &&
    !!routerAddress;

  const handleMaxAvailable = () => {
    if (maxBorrowEffective <= 0) return;
    const rounded = Math.floor(maxBorrowEffective * 1e8) / 1e8;
    setAmountInput(String(rounded));
  };

  const submit = () => {
    if (!valid || submitting) return;
    if (needsApproval) {
      approveHook.approve(collateralAmountWei);
      return;
    }
    if (!routerAddress) return;
    const order: BorrowOrder = {
      loanToken: loanToken.address,
      collateralToken: collateralToken.address,
      loanAmount: loanAmountWei,
      collateralAmount: collateralAmountWei,
      maxAvgRatePerSecond: annualRateToRatePerSecond(maxAvgRate),
      minHealthFactor: BigInt(Math.round(hf * 1e18)),
      candidates: walk.fills.map((f) => ({
        creator: f.lender as `0x${string}`,
        ratePerSecond: f.ratePerSecondRaw,
      })),
    };
    borrowHook.borrow(order);
  };

  // Approve landed → refetch allowance so the button flips to "Borrow".
  useEffect(() => {
    if (!approveHook.isSuccess) return;
    const hash = approveHook.hash;
    allowance.refetch();
    toast.success(`${collateralToken.symbol} approved`, {
      description: `The router can now pull collateral for this borrow.`,
      action: txAction(hash),
    });
    approveHook.reset();
  }, [approveHook.isSuccess, approveHook, allowance, collateralToken.symbol]);

  useEffect(() => {
    if (!approveHook.error) return;
    toast.error("Approval failed", {
      description: humanizeError(approveHook.error),
    });
    approveHook.reset();
  }, [approveHook.error, approveHook]);

  // Borrow landed → toast, invalidate borrower-loans + balances + markets,
  // close.
  useEffect(() => {
    if (!borrowHook.isSuccess) return;
    const hash = borrowHook.hash;
    toast.success(
      `Borrowed ${formatTokenAmount(requestedSafe, {
        decimals: Math.min(loanToken.decimals, 6),
      })} ${loanToken.symbol}`,
      {
        description: `Repay any time from the dashboard.`,
        action: txAction(hash),
      },
    );
    queryClient.invalidateQueries({ queryKey: ["borrower-loans"] });
    queryClient.invalidateQueries({ queryKey: ["market-depth"] });
    queryClient.invalidateQueries({ queryKey: ["markets"] });
    borrowHook.reset();
    onClose();
  }, [
    borrowHook.isSuccess,
    borrowHook,
    queryClient,
    requestedSafe,
    loanToken.decimals,
    loanToken.symbol,
    onClose,
  ]);

  useEffect(() => {
    if (!borrowHook.error) return;
    toast.error("Borrow failed", {
      description: humanizeError(borrowHook.error),
    });
    borrowHook.reset();
  }, [borrowHook.error, borrowHook]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Borrow ${loanToken.symbol}`}
      className="max-w-[616px]"
    >
      <p className="text-sm text-text-secondary">
        Borrow {loanToken.symbol} against {collateralToken.symbol} collateral.
        The router walks the order book top-down to fill your size.
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <label className="text-sm text-text-secondary">Borrow amount</label>
          <span className="text-xs text-text-muted">
            Best rate {formatPercent(walk.bestRate)}
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
                if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
                // Clamp on type to the orderbook's available depth — you
                // can't borrow more than the book can fill, so don't let
                // the user type past it.
                const parsed = parseFloat(v);
                if (
                  Number.isFinite(parsed) &&
                  availableDepth > 0 &&
                  parsed > availableDepth
                ) {
                  setAmountInput(
                    String(Math.floor(availableDepth * 1e8) / 1e8),
                  );
                  return;
                }
                setAmountInput(v);
              }}
              aria-label={`Borrow amount in ${loanToken.symbol}`}
              className="w-full bg-transparent text-2xl font-medium tabular-nums text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <div className="flex shrink-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={loanToken.iconUrl}
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-contain"
              />
              <span className="font-semibold text-text-primary">
                {loanToken.symbol}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span className="tabular-nums">{formatUsd(borrowUsd)}</span>
            <span className="tabular-nums">
              Available{" "}
              {depthQuery.isPending
                ? "…"
                : `${formatTokenAmount(availableDepth, {
                    decimals: Math.min(loanToken.decimals, 6),
                  })} ${loanToken.symbol}`}
              {maxBorrowEffective > 0 ? (
                <button
                  type="button"
                  onClick={handleMaxAvailable}
                  title={
                    maxBorrowFromCollateral < availableDepth
                      ? `Capped by your ${collateralToken.symbol} collateral at HF ${hf.toFixed(1)} — borrow up to ${formatTokenAmount(maxBorrowEffective, { decimals: Math.min(loanToken.decimals, 6) })} ${loanToken.symbol}`
                      : `Capped by available orderbook depth — borrow up to ${formatTokenAmount(maxBorrowEffective, { decimals: Math.min(loanToken.decimals, 6) })} ${loanToken.symbol}`
                  }
                  className="ml-2 font-semibold text-accent transition-colors duration-base ease-out-expo hover:text-accent-hover"
                >
                  MAX
                </button>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <label htmlFor="hf-slider">Target health factor</label>
              <Tooltip
                side="top"
                content="Where you want the position's HF to land after the borrow. Higher = more collateral required, but more buffer against liquidation."
              />
            </span>
            <span className="text-sm font-medium tabular-nums text-text-primary">
              {hf.toFixed(1)}
            </span>
          </div>
          <input
            id="hf-slider"
            type="range"
            min={HF_MIN}
            max={HF_MAX}
            step={HF_STEP}
            value={hf}
            onChange={(e) => setHf(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-bg-sunken accent-accent"
          />
          <div className="mt-1 flex justify-between text-[10px] text-text-muted">
            <span>{HF_MIN.toFixed(1)} (risky)</span>
            <span>{HF_MAX.toFixed(1)} (safe)</span>
          </div>
        </div>

        <div>
          <span className="mb-2 flex items-center gap-1.5 text-sm text-text-secondary">
            <label htmlFor="slippage">Max rate slippage</label>
            <Tooltip
              side="top"
              content="Caps the weighted-average rate you'll pay. If the orderbook walk would push the average above (best rate × (1 + slippage)), the borrow is rejected."
            />
          </span>
          <div className="flex h-10 items-center rounded-md border border-border bg-bg px-3">
            <input
              id="slippage"
              type="text"
              inputMode="decimal"
              value={slippageInput}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) setSlippageInput(v);
              }}
              className="w-full bg-transparent text-base tabular-nums text-text-primary placeholder:text-text-muted focus:outline-none"
              placeholder="1.0"
            />
            <span className="ml-2 text-sm text-text-muted">%</span>
          </div>
          <p className="mt-1 text-[10px] text-text-muted">
            Max avg rate {formatPercent(maxAvgRate)}
          </p>
        </div>
      </div>

      {walk.fills.length > 0 ? (
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-sm text-text-secondary">Order book fill</p>
            <span className="text-xs text-text-muted">
              {walk.fills.length} lender{walk.fills.length === 1 ? "" : "s"} ·
              avg {formatPercent(walk.weightedAvgRate)}
            </span>
          </div>
          <div className="rounded-md border border-border p-2">
            <BorrowFlowSankey fills={walk.fills} loanToken={loanToken} />
          </div>
        </div>
      ) : null}

      {insufficientCollateralBalance ? (
        <Alert>
          You need{" "}
          {formatTokenAmount(requiredCollateralAmount, {
            decimals: Math.min(collateralToken.decimals, 8),
          })}{" "}
          {collateralToken.symbol} as collateral but your wallet only holds{" "}
          {formatTokenAmount(collateralBalance.amount, {
            decimals: Math.min(collateralToken.decimals, 8),
          })}{" "}
          {collateralToken.symbol}.
        </Alert>
      ) : exceedsDepth ? (
        <Alert>
          The orderbook only has{" "}
          {formatTokenAmount(availableDepth, {
            decimals: Math.min(loanToken.decimals, 6),
          })}{" "}
          {loanToken.symbol} available across all lenders for this pair.
        </Alert>
      ) : exceedsCollateral ? (
        <Alert>
          Your current {collateralToken.symbol} balance only supports borrowing{" "}
          up to{" "}
          {formatTokenAmount(maxBorrowFromCollateral, {
            decimals: Math.min(loanToken.decimals, 6),
          })}{" "}
          {loanToken.symbol} at HF {hf.toFixed(1)}.
        </Alert>
      ) : slippageExceeded ? (
        <Alert>
          Filling the requested size would push the average rate to{" "}
          {formatPercent(walk.weightedAvgRate)}, above your{" "}
          {formatPercent(maxAvgRate)} cap. Raise the slippage tolerance or
          lower the amount.
        </Alert>
      ) : null}

      <div className="mt-5 rounded-md border border-border bg-bg px-3 py-3 text-sm">
        <SummaryRow
          label="Required collateral"
          value={`${formatTokenAmount(requiredCollateralAmount, {
            decimals: Math.min(collateralToken.decimals, 8),
          })} ${collateralToken.symbol}`}
          sub={formatUsd(requiredCollateralUsd)}
        />
        <Divider />
        <SummaryRow
          label="Weighted avg rate"
          value={formatPercent(walk.weightedAvgRate)}
          tooltip="Size-weighted average APY across the lenders this borrow would draw from."
        />
        <Divider />
        <SummaryRow
          label="LLTV"
          value={formatPercent(lltv)}
          tooltip="Loan-to-value cap. A borrow at LLTV is at HF 1.0; below it triggers liquidation."
        />
      </div>

      <ChainAwareButton
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        onClick={submit}
        disabled={!valid || submitting}
      >
        {buttonLabel({
          submitting,
          approving,
          borrowing,
          isConfirmingApprove: approveHook.isConfirming,
          isConfirmingBorrow: borrowHook.isConfirming,
          requestedSafe,
          exceedsCollateral,
          exceedsDepth,
          insufficientCollateralBalance,
          slippageExceeded,
          needsApproval,
          loanSymbol: loanToken.symbol,
          collateralSymbol: collateralToken.symbol,
          routerConfigured: !!routerAddress,
        })}
      </ChainAwareButton>
    </Modal>
  );
}

function SummaryRow({
  label,
  value,
  sub,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="flex items-center gap-1.5 text-text-secondary">
        <span>{label}</span>
        {tooltip ? <Tooltip side="top" content={tooltip} /> : null}
      </span>
      <div className="text-right">
        <p className="font-medium tabular-nums text-text-primary">{value}</p>
        {sub ? (
          <p className="text-xs tabular-nums text-text-muted">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

interface DepthWalk {
  fills: BorrowFill[];
  totalFilled: number;
  weightedAvgRate: number;
  bestRate: number;
}

// Greedy top-down walk over the real depth steps. Steps come from the
// indexer pre-sorted by ratePerSecond ascending, so the cheapest lender
// fills first. Each step contributes at most `step.sizeAmount` to the
// borrow.
function walkDepth(
  steps: DepthStep[],
  requested: number,
  loanDecimals: number,
): DepthWalk {
  let remaining = requested;
  let rateXSize = 0;
  const fills: BorrowFill[] = [];
  for (const step of steps) {
    if (remaining <= 1e-12) break;
    const stepFloat = baseUnitsToNumber(step.sizeAmount, loanDecimals);
    const take = Math.min(remaining, stepFloat);
    if (take > 1e-12) {
      fills.push({
        lender: step.lender,
        ratePerSecond: step.apy,
        ratePerSecondRaw: step.ratePerSecondRaw,
        amount: take,
      });
      rateXSize += step.apy * take;
      remaining -= take;
    }
  }
  const totalFilled = Math.max(0, requested - remaining);
  return {
    fills,
    totalFilled,
    weightedAvgRate: totalFilled > 0 ? rateXSize / totalFilled : 0,
    bestRate: steps.length > 0 ? steps[0].apy : 0,
  };
}

interface ButtonLabelArgs {
  submitting: boolean;
  approving: boolean;
  borrowing: boolean;
  isConfirmingApprove: boolean;
  isConfirmingBorrow: boolean;
  requestedSafe: number;
  exceedsCollateral: boolean;
  exceedsDepth: boolean;
  insufficientCollateralBalance: boolean;
  slippageExceeded: boolean;
  needsApproval: boolean;
  loanSymbol: string;
  collateralSymbol: string;
  routerConfigured: boolean;
}

function buttonLabel(a: ButtonLabelArgs): string {
  if (!a.routerConfigured) return "Router not configured";
  if (a.approving)
    return a.isConfirmingApprove ? "Confirming approval…" : "Sign approval…";
  if (a.borrowing)
    return a.isConfirmingBorrow ? "Confirming borrow…" : "Sign borrow…";
  if (a.requestedSafe <= 0) return "Enter an amount";
  if (a.insufficientCollateralBalance)
    return `Not enough ${a.collateralSymbol}`;
  if (a.exceedsDepth) return "Not enough depth";
  if (a.exceedsCollateral) return "Insufficient collateral";
  if (a.slippageExceeded) return "Rate exceeds slippage";
  if (a.needsApproval) return `Approve ${a.collateralSymbol}`;
  return `Borrow ${a.loanSymbol}`;
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-3 flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-text-secondary",
      )}
    >
      <TriangleAlert
        size={16}
        className="mt-0.5 shrink-0 text-warn"
        aria-hidden="true"
      />
      <p>{children}</p>
    </div>
  );
}
