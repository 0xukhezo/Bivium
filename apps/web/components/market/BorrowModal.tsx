"use client";

import { useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/MockBadge";
import { BorrowFlowSankey, type BorrowFill } from "./BorrowFlowSankey";
import type { Market } from "@/lib/markets";
import type { DepthStep } from "@/lib/api/market-depth";
import { useMarketDepth } from "@/hooks/useMarketDepth";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import {
  cn,
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
  const { loanToken, collateralToken, lltv } = market;

  const [amountInput, setAmountInput] = useState("");
  const [hf, setHf] = useState(HF_DEFAULT);
  const [slippageInput, setSlippageInput] = useState(SLIPPAGE_DEFAULT);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountInput("");
      setHf(HF_DEFAULT);
      setSlippageInput(SLIPPAGE_DEFAULT);
      setSubmitting(false);
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

  // Real on-chain ERC-20 balances.
  //   - `loanBalance` powers the "Balance" subtitle under the input — it
  //     matches the token the user is borrowing (mirrors a swap UI's
  //     in-token balance).
  //   - `collateralBalance` is the input to the MAX button and the
  //     insufficient-collateral guard.
  const loanBalance = useTokenBalance(loanToken);
  const collateralBalance = useTokenBalance(collateralToken);

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

  const requested = parseFloat(amountInput);
  const requestedSafe =
    Number.isFinite(requested) && requested > 0 ? requested : 0;
  const slippagePct = parseFloat(slippageInput);
  const slippageSafe = Number.isFinite(slippagePct) && slippagePct >= 0
    ? slippagePct
    : 0;

  // Walk the real depth top-down (cheapest first), filling `requestedSafe`
  // from each lender's size until the borrow is satisfied or we run out.
  const walk = useMemo(() => walkDepth(steps, requestedSafe), [
    steps,
    requestedSafe,
  ]);

  const borrowUsd = requestedSafe * loanPrice;
  const requiredCollateralUsd = lltv > 0 ? (hf * borrowUsd) / lltv : 0;
  const requiredCollateralAmount =
    collateralPrice > 0 ? requiredCollateralUsd / collateralPrice : 0;

  const exceedsCollateral =
    requestedSafe > 0 &&
    maxBorrowFromCollateral > 0 &&
    requestedSafe > maxBorrowFromCollateral + 1e-9;

  const maxAvgRate = walk.bestRate * (1 + slippageSafe / 100);

  const slippageExceeded =
    requestedSafe > 0 && walk.weightedAvgRate > maxAvgRate + 1e-9;

  const valid =
    requestedSafe > 0 &&
    walk.fills.length > 0 &&
    !slippageExceeded &&
    !exceedsCollateral;

  const handleMaxAvailable = () => {
    if (maxBorrowFromCollateral <= 0) return;
    const rounded = Math.floor(maxBorrowFromCollateral * 1e8) / 1e8;
    setAmountInput(String(rounded));
  };

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    // TODO: wire BiviumRouter.borrow via useBiviumRouterWrite.
    await new Promise((r) => setTimeout(r, 1400));
    setSubmitting(false);
    onClose();
  };

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

      {/* TODO(remove-when-real): the Borrow button still only fires a
          setTimeout — `BiviumRouter.borrow` isn't wired through a write
          hook yet. Everything else (orderbook depth, prices, LLTV,
          required-collateral math) reads from the indexer / chain. */}
      <div className="mt-4 flex items-start gap-2 rounded-md border-2 border-danger bg-danger/5 p-3 text-xs text-text-secondary">
        <MockBadge>Mock submit</MockBadge>
        <p>
          The Borrow button is a placeholder — clicking it doesn&apos;t
          execute a real <span className="font-mono">BiviumRouter.borrow</span>{" "}
          yet. The orderbook walk, rates, prices, and collateral math are all
          real.
        </p>
      </div>

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
              Balance{" "}
              {loanBalance.isLoading
                ? "…"
                : `${formatTokenAmount(loanBalance.amount, {
                    decimals: Math.min(loanToken.decimals, 6),
                  })} ${loanToken.symbol}`}
              {maxBorrowFromCollateral > 0 ? (
                <button
                  type="button"
                  onClick={handleMaxAvailable}
                  title={`Borrow up to ${formatTokenAmount(maxBorrowFromCollateral, { decimals: Math.min(loanToken.decimals, 6) })} ${loanToken.symbol} against your current ${collateralToken.symbol} balance`}
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
            <label
              htmlFor="hf-slider"
              className="text-sm text-text-secondary"
            >
              Target health factor
            </label>
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
          <label
            htmlFor="slippage"
            className="mb-2 block text-sm text-text-secondary"
          >
            Max rate slippage
          </label>
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

      {exceedsCollateral ? (
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
        />
        <Divider />
        <SummaryRow
          label="LLTV"
          value={formatPercent(lltv)}
          sub={`At HF 1.0, ${formatUsd(borrowUsd / Math.max(lltv, 1e-9))} of collateral required`}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        onClick={submit}
        disabled={!valid || submitting}
      >
        {submitting
          ? "Confirming…"
          : requestedSafe <= 0
            ? "Enter an amount"
            : exceedsCollateral
              ? "Insufficient collateral"
              : slippageExceeded
                ? "Rate exceeds slippage"
                : `Borrow ${loanToken.symbol}`}
      </Button>
    </Modal>
  );
}

function SummaryRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-text-secondary">{label}</span>
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
function walkDepth(steps: DepthStep[], requested: number): DepthWalk {
  let remaining = requested;
  let rateXSize = 0;
  const fills: BorrowFill[] = [];
  for (const step of steps) {
    if (remaining <= 1e-12) break;
    const take = Math.min(remaining, step.sizeAmount);
    if (take > 1e-12) {
      fills.push({ lender: step.lender, ratePerSecond: step.apy, amount: take });
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
