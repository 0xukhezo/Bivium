"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChainAwareButton } from "@/components/wallet/ChainAwareButton";
import { AVAILABLE_LEND_ASSETS, type LendingAsset } from "@/lib/lender";
import { useSetRate } from "@/hooks/useLenderProfileWrite";
import { useLenderRates } from "@/hooks/useLenderProfile";
import type { Token } from "@/lib/tokens";
import { cn, ratePerSecondToAnnual } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";

function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function findAsset(list: LendingAsset[], address: string) {
  return list.find((a) => sameAddress(a.token.address, address));
}

function hasDiff(a: LendingAsset[], b: LendingAsset[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((aa) => {
    const match = findAsset(b, aa.token.address);
    return !match || match.ratePerSecond !== aa.ratePerSecond;
  });
}

interface PendingOp {
  token: Token;
  annualRate: number;
}

function computeOps(
  persisted: LendingAsset[],
  draft: LendingAsset[],
): PendingOp[] {
  const ops: PendingOp[] = [];
  for (const d of draft) {
    const p = findAsset(persisted, d.token.address);
    if (!p || p.ratePerSecond !== d.ratePerSecond) {
      ops.push({ token: d.token, annualRate: d.ratePerSecond });
    }
  }
  for (const p of persisted) {
    if (!findAsset(draft, p.token.address)) {
      ops.push({ token: p.token, annualRate: 0 });
    }
  }
  return ops;
}

export function LendingAssetsCard() {
  const setRateHook = useSetRate();

  const ratesQuery = useLenderRates(AVAILABLE_LEND_ASSETS);
  const persisted = useMemo<LendingAsset[]>(() => {
    const out: LendingAsset[] = [];
    for (const token of AVAILABLE_LEND_ASSETS) {
      const rps = ratesQuery.ratesByAddress.get(token.address.toLowerCase());
      if (rps !== undefined && rps > 0n) {
        out.push({
          token,
          ratePerSecond: ratePerSecondToAnnual(rps),
        });
      }
    }
    return out;
  }, [ratesQuery.ratesByAddress]);

  const [draft, setDraft] = useState<LendingAsset[]>([]);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  const [opsQueue, setOpsQueue] = useState<PendingOp[]>([]);
  const [opIndex, setOpIndex] = useState<number>(-1);
  const totalOpsRef = useRef<number>(0);
  const successfulOpsRef = useRef<LendingAsset[]>([]);

  const submitting = opIndex >= 0;

  const toggle = (token: Token) => {
    if (submitting) return;
    const key = token.address.toLowerCase();
    if (findAsset(draft, token.address)) {
      setDraft((prev) =>
        prev.filter((a) => !sameAddress(a.token.address, token.address)),
      );
      setRateInputs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setDraft((prev) => [...prev, { token, ratePerSecond: 0.05 }]);
      setRateInputs((prev) => ({ ...prev, [key]: "5.00" }));
    }
  };

  const updateRate = (address: string, raw: string) => {
    if (submitting) return;
    const key = address.toLowerCase();
    setRateInputs((prev) => ({ ...prev, [key]: raw }));
    const v = parseFloat(raw);
    const ratePerSecond = Number.isNaN(v) ? 0 : Math.max(0, v) / 100;
    setDraft((prev) =>
      prev.map((a) =>
        sameAddress(a.token.address, address) ? { ...a, ratePerSecond } : a,
      ),
    );
  };

  const dirty = hasDiff(draft, persisted);

  const previewOps = useMemo(
    () => computeOps(persisted, draft),
    [persisted, draft],
  );

  const startSave = () => {
    const ops = computeOps(persisted, draft);
    if (ops.length === 0) return;
    opsQueue.length;
    setOpsQueue(ops);
    totalOpsRef.current = ops.length;
    successfulOpsRef.current = [];
    setOpIndex(0);
  };

  useEffect(() => {
    if (opIndex < 0) return;
    const op = opsQueue[opIndex];
    if (!op) return;
    if (setRateHook.isPending || setRateHook.isConfirming) return;
    if (setRateHook.hash || setRateHook.error) return;
    setRateHook.setRate(op.token.address, op.annualRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opIndex, opsQueue]);

  useEffect(() => {
    if (opIndex < 0 || !setRateHook.isSuccess) return;
    const op = opsQueue[opIndex];
    if (op && op.annualRate > 0) {
      successfulOpsRef.current = [
        ...successfulOpsRef.current.filter(
          (a) => !sameAddress(a.token.address, op.token.address),
        ),
        { token: op.token, ratePerSecond: op.annualRate },
      ];
    } else if (op && op.annualRate === 0) {
      successfulOpsRef.current = successfulOpsRef.current.filter(
        (a) => !sameAddress(a.token.address, op.token.address),
      );
    }

    setRateHook.reset();
    const nextIndex = opIndex + 1;
    if (nextIndex >= opsQueue.length) {
      ratesQuery.refetch();
      setOpIndex(-1);
      setOpsQueue([]);
      const count = totalOpsRef.current;
      totalOpsRef.current = 0;
      toast.success("Lending preferences saved", {
        description:
          count === 1
            ? "1 rate update confirmed on-chain."
            : `${count} rate updates confirmed on-chain.`,
      });
    } else {
      setOpIndex(nextIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRateHook.isSuccess, opIndex]);

  useEffect(() => {
    if (!setRateHook.error || opIndex < 0) return;
    ratesQuery.refetch();
    setOpIndex(-1);
    setOpsQueue([]);
    totalOpsRef.current = 0;
    toast.error("Save halted", {
      description: humanizeError(setRateHook.error),
    });
    setRateHook.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRateHook.error]);

  const buttonLabel = (() => {
    if (!submitting) return "Save preferences";
    const total = totalOpsRef.current || opsQueue.length;
    const step = opIndex + 1;
    return `Saving ${step}/${total}…`;
  })();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Lending assets</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Pick assets you&apos;ll lend and set a fixed rate per asset.
          </p>
        </div>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {AVAILABLE_LEND_ASSETS.map((token) => {
          const key = token.address.toLowerCase();
          const selected = findAsset(draft, token.address);
          return (
            <li key={token.address}>
              <div
                className={cn(
                  "rounded-md border border-border bg-bg p-3 transition-colors duration-base ease-out-expo",
                  selected && "border-accent",
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={Boolean(selected)}
                    aria-label={`Toggle ${token.symbol}`}
                    onClick={() => toggle(token)}
                    disabled={submitting}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors duration-base ease-out-expo disabled:opacity-50",
                      selected
                        ? "border-accent bg-accent text-arb-white"
                        : "border-border bg-bg-elevated hover:border-accent",
                    )}
                  >
                    {selected ? (
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    ) : null}
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={token.iconUrl}
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                    className="h-6 w-6 shrink-0 rounded-full object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">
                      {token.symbol}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {token.name}
                    </p>
                  </div>
                  {selected ? (
                    <label className="flex items-center gap-1.5">
                      <span className="sr-only">
                        Rate for {token.symbol} in percent
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={rateInputs[key] ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                            updateRate(token.address, raw);
                          }
                        }}
                        disabled={submitting}
                        className="h-10 w-20 rounded-md border border-border bg-bg-elevated px-2 text-right text-sm tabular-nums text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
                      />
                      <span className="text-sm text-text-muted">%</span>
                    </label>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          {submitting
            ? "Confirm each wallet prompt to continue."
            : dirty
              ? previewOps.length === 1
                ? "Saving requires 1 transaction."
                : `Saving requires ${previewOps.length} transactions.`
              : "No unsaved changes."}
        </p>
        <ChainAwareButton
          variant="primary"
          size="md"
          onClick={startSave}
          disabled={!dirty || submitting}
        >
          {buttonLabel}
        </ChainAwareButton>
      </div>
    </Card>
  );
}
