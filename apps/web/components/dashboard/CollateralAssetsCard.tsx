"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AVAILABLE_COLLATERAL_ASSETS,
  MOCK_LENDER_PREFERENCES,
} from "@/lib/lender";
import { useSetAllowedCollaterals } from "@/hooks/useLenderProfileWrite";
import type { Token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function hasDiff(a: Token[], b: Token[]): boolean {
  if (a.length !== b.length) return true;
  return !a.every((aa) => b.some((bb) => sameAddress(aa.address, bb.address)));
}

/**
 * Saves the accepted-collateral list with a single bulk
 * BiviumProfile.setAllowedCollaterals(addresses[]) call — one wallet prompt,
 * one tx, the whole list replaced atomically. */
export function CollateralAssetsCard() {
  const [persisted, setPersisted] = useState<Token[]>(
    MOCK_LENDER_PREFERENCES.collateralAssets,
  );
  const [draft, setDraft] = useState<Token[]>(persisted);

  const writeHook = useSetAllowedCollaterals();
  const submitting = writeHook.isPending || writeHook.isConfirming;

  const toggle = (token: Token) => {
    if (submitting) return;
    setDraft((prev) => {
      if (prev.some((t) => sameAddress(t.address, token.address))) {
        return prev.filter((t) => !sameAddress(t.address, token.address));
      }
      return [...prev, token];
    });
  };

  const dirty = hasDiff(draft, persisted);

  const save = () => {
    if (!dirty || submitting) return;
    writeHook.setAllowedCollaterals(draft.map((t) => t.address));
  };

  // Commit draft → persisted once the bulk tx confirms.
  useEffect(() => {
    if (!writeHook.isSuccess) return;
    setPersisted(draft);
    writeHook.reset();
    toast.success("Accepted collateral updated", {
      description:
        draft.length === 0
          ? "Collateral list is empty — no new borrows possible until you re-enable one."
          : `${draft.length} ${draft.length === 1 ? "token" : "tokens"} accepted as collateral.`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeHook.isSuccess]);

  // Surface errors as toasts (wallet rejection, revert).
  useEffect(() => {
    if (!writeHook.error) return;
    toast.error("Save failed", {
      description: readableWriteError(writeHook.error),
    });
    writeHook.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeHook.error]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Accepted collateral</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Select assets you&apos;ll accept as collateral on your markets.
          </p>
        </div>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {AVAILABLE_COLLATERAL_ASSETS.map((token) => {
          const selected = draft.some((t) =>
            sameAddress(t.address, token.address),
          );
          return (
            <li key={token.address}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(token)}
                disabled={submitting}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border bg-bg p-3 text-left transition-colors duration-base ease-out-expo disabled:opacity-60",
                  selected
                    ? "border-accent"
                    : "border-border hover:border-accent",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors duration-base ease-out-expo",
                    selected
                      ? "border-accent bg-accent text-arb-white"
                      : "border-border bg-bg-elevated",
                  )}
                >
                  {selected ? (
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  ) : null}
                </span>
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
                  <p className="font-medium text-text-primary">{token.symbol}</p>
                  <p className="truncate text-xs text-text-muted">
                    {token.name}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          {submitting
            ? "Confirm the wallet prompt to continue."
            : dirty
              ? "Saving requires 1 transaction."
              : "No unsaved changes."}
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={save}
          disabled={!dirty || submitting}
        >
          {submitting ? "Confirming…" : "Save preferences"}
        </Button>
      </div>
    </Card>
  );
}

function readableWriteError(err: Error): string {
  const anyErr = err as Error & { shortMessage?: string };
  return anyErr.shortMessage ?? err.message;
}
