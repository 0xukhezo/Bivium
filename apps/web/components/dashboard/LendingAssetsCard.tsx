"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AVAILABLE_LEND_ASSETS,
  MOCK_LENDER_PREFERENCES,
  type LendingAsset,
} from "@/lib/lender";
import { useSetRate } from "@/hooks/useLenderProfileWrite";
import type { Token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

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

function buildInitialRateInputs(
  assets: LendingAsset[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of assets) {
    map[a.token.address.toLowerCase()] = (a.ratePerSecond * 100).toFixed(2);
  }
  return map;
}

/**
 * One sequenced setRate call per dirty asset. The Profile contract has no
 * multicall, so each token gets its own wallet prompt. Operations are:
 *   - added / rate-changed → setRate(token, annualRate)
 *   - removed              → setRate(token, 0)
 */
interface PendingOp {
  token: Token;
  /** Annual rate as a 0–1 fraction. 0 = remove. */
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
  const [persisted, setPersisted] = useState<LendingAsset[]>(
    MOCK_LENDER_PREFERENCES.lendingAssets,
  );
  const [draft, setDraft] = useState<LendingAsset[]>(persisted);
  // Raw text per asset so users can type freely without controlled-input
  // reformatting fighting their keystrokes.
  const [rateInputs, setRateInputs] = useState<Record<string, string>>(() =>
    buildInitialRateInputs(persisted),
  );

  const setRateHook = useSetRate();

  // Sequenced submission state.
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
        sameAddress(a.token.address, address)
          ? { ...a, ratePerSecond }
          : a,
      ),
    );
  };

  const dirty = hasDiff(draft, persisted);

  // Pre-computed op list — also used to render "Saving 1/3…" labels.
  const previewOps = useMemo(
    () => computeOps(persisted, draft),
    [persisted, draft],
  );

  const startSave = () => {
    const ops = computeOps(persisted, draft);
    if (ops.length === 0) return;
    opsQueue.length; // hold reference (TS noise — silenced by referencing useState val)
    setOpsQueue(ops);
    totalOpsRef.current = ops.length;
    successfulOpsRef.current = [];
    setOpIndex(0);
  };

  // Fire the next setRate when we advance opIndex (and on initial 0).
  useEffect(() => {
    if (opIndex < 0) return;
    const op = opsQueue[opIndex];
    if (!op) return;
    if (setRateHook.isPending || setRateHook.isConfirming) return;
    if (setRateHook.hash || setRateHook.error) return;
    setRateHook.setRate(op.token.address, op.annualRate);
    // setRate is fire-and-forget; receipt drives the next step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opIndex, opsQueue]);

  // Advance on receipt.
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
      // Done — commit the draft as persisted, surface a summary toast.
      setPersisted(draft);
      setRateInputs(buildInitialRateInputs(draft));
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

  // Halt the sequence on error (user rejected, revert, etc.). Anything we
  // did already confirm stays persisted on-chain, so we merge it locally so
  // the UI reflects reality and the user can pick up where they left off.
  useEffect(() => {
    if (!setRateHook.error || opIndex < 0) return;
    const partial = mergeOps(persisted, successfulOpsRef.current);
    setPersisted(partial);
    setRateInputs(buildInitialRateInputs(partial));
    setOpIndex(-1);
    setOpsQueue([]);
    totalOpsRef.current = 0;
    toast.error("Save halted", {
      description: readableWriteError(setRateHook.error),
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
        <Button
          variant="primary"
          size="md"
          onClick={startSave}
          disabled={!dirty || submitting}
        >
          {buttonLabel}
        </Button>
      </div>
    </Card>
  );
}

function mergeOps(
  base: LendingAsset[],
  ops: LendingAsset[],
): LendingAsset[] {
  const next = base.filter(
    (b) => !ops.some((o) => sameAddress(o.token.address, b.token.address)),
  );
  for (const op of ops) next.push(op);
  return next;
}

function readableWriteError(err: Error): string {
  const anyErr = err as Error & { shortMessage?: string };
  return anyErr.shortMessage ?? err.message;
}
