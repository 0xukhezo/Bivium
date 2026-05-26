"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AVAILABLE_COLLATERAL_ASSETS,
  MOCK_LENDER_PREFERENCES,
} from "@/lib/lender";
import type { Token } from "@/lib/tokens";
import { cn } from "@/lib/utils";

function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function hasDiff(a: Token[], b: Token[]): boolean {
  if (a.length !== b.length) return true;
  return !a.every((aa) => b.some((bb) => sameAddress(aa.address, bb.address)));
}

export function CollateralAssetsCard() {
  const [persisted, setPersisted] = useState<Token[]>(
    MOCK_LENDER_PREFERENCES.collateralAssets,
  );
  const [draft, setDraft] = useState<Token[]>(persisted);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (token: Token) => {
    setDraft((prev) => {
      if (prev.some((t) => sameAddress(t.address, token.address))) {
        return prev.filter((t) => !sameAddress(t.address, token.address));
      }
      return [...prev, token];
    });
  };

  const dirty = hasDiff(draft, persisted);

  const save = async () => {
    setSubmitting(true);
    // Mock blockchain tx — replace with wagmi writeContract once wired.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setPersisted(draft);
    setSubmitting(false);
  };

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
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border bg-bg p-3 text-left transition-colors duration-base ease-out-expo",
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
          {dirty
            ? "Saving requires a blockchain transaction."
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
