"use client";

import { useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/MockBadge";
import { BorrowFlowSankey } from "./BorrowFlowSankey";
import { offersForPair, walkOrderbook } from "@/lib/lender-offers";
import type { Market } from "@/lib/markets";
import { cn, formatCompact, formatPercent, formatUsd } from "@/lib/utils";

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

  const offers = useMemo(
    () => offersForPair(loanToken, collateralToken),
    [loanToken, collateralToken],
  );

  const totalAvailable = useMemo(
    () => offers.reduce((sum, o) => sum + o.indicativeSize.amount, 0),
    [offers],
  );

  const requested = parseFloat(amountInput);
  const requestedSafe =
    Number.isFinite(requested) && requested > 0
      ? Math.min(requested, totalAvailable)
      : 0;
  const slippagePct = parseFloat(slippageInput);
  const slippageSafe = Number.isFinite(slippagePct) && slippagePct >= 0
    ? slippagePct
    : 0;

  const walk = useMemo(
    () => walkOrderbook(offers, requestedSafe),
    [offers, requestedSafe],
  );

  // Real USD prices come through `Market.loanPriceUsd` /
  // `Market.collateralPriceUsd` from the indexer-curated `tokens` table.
  // Fall back to 0 only when a price is missing — the dependent UI shows
  // `$0.00` rather than a fake number.
  const loanPrice = market.loanPriceUsd ?? 0;
  const collateralPrice = market.collateralPriceUsd ?? 0;

  const borrowUsd = requestedSafe * loanPrice;
  const requiredCollateralUsd = lltv > 0 ? (hf * borrowUsd) / lltv : 0;
  const requiredCollateralAmount =
    collateralPrice > 0 ? requiredCollateralUsd / collateralPrice : 0;

  const maxAvgRate = walk.bestRate * (1 + slippageSafe / 100);

  const slippageExceeded =
    requestedSafe > 0 && walk.weightedAvgRate > maxAvgRate + 1e-9;

  const valid =
    requestedSafe > 0 && walk.fills.length > 0 && !slippageExceeded;

  const handleMaxAvailable = () => {
    const rounded = Math.round(totalAvailable * 1e8) / 1e8;
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

      {/* TODO(remove-when-real): borrow-side mocks. The lender orderbook
          (best rate, MAX, fill walk, weighted-avg rate) is fed by
          `lib/lender-offers.ts` and `BiviumRouter.borrow` isn't wired —
          the submit button only fires a setTimeout. Real prices, LLTV,
          and required collateral come from the API. */}
      <div className="mt-4 flex items-start gap-2 rounded-md border-2 border-danger bg-danger/5 p-3 text-xs text-text-secondary">
        <MockBadge>Mock data</MockBadge>
        <p>
          The orderbook (best rate, available depth, fill walk, weighted-avg
          rate) and the Borrow submit are placeholders. Token prices, LLTV,
          and required-collateral math are real.
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
                const parsed = parseFloat(v);
                if (
                  Number.isFinite(parsed) &&
                  parsed > totalAvailable &&
                  totalAvailable > 0
                ) {
                  setAmountInput(
                    String(Math.round(totalAvailable * 1e8) / 1e8),
                  );
                } else {
                  setAmountInput(v);
                }
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
              Available {formatCompact(totalAvailable)} {loanToken.symbol}
              <button
                type="button"
                onClick={handleMaxAvailable}
                className="ml-2 font-semibold text-accent transition-colors duration-base ease-out-expo hover:text-accent-hover"
              >
                MAX
              </button>
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-text-secondary">Order book fill</p>
              <MockBadge />
            </div>
            <span className="text-xs text-text-muted">
              {walk.fills.length} lender{walk.fills.length === 1 ? "" : "s"} ·
              avg {formatPercent(walk.weightedAvgRate)}
            </span>
          </div>
          {/* TODO(remove-when-real): Sankey reads from the mocked orderbook
              walk. Drop the !border-danger override when the depth API
              endpoint is wired. */}
          <div className="rounded-md border-2 border-danger p-2">
            <BorrowFlowSankey fills={walk.fills} loanToken={loanToken} />
          </div>
        </div>
      ) : null}

      {slippageExceeded ? (
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
          value={`${formatCompact(requiredCollateralAmount)} ${collateralToken.symbol}`}
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
