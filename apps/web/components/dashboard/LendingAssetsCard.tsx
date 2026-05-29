"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AVAILABLE_LEND_ASSETS,
  MOCK_LENDER_PREFERENCES,
  type LendingAsset,
} from "@/lib/lender";
import type { Token } from "@/lib/tokens";
import { cn } from "@/lib/utils";

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
  const [submitting, setSubmitting] = useState(false);

  const toggle = (token: Token) => {
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

  const save = async () => {
    setSubmitting(true);
    // Mock blockchain tx — replace with wagmi writeContract once wired.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setPersisted(draft);
    setRateInputs(buildInitialRateInputs(draft));
    setSubmitting(false);
  };

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
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors duration-base ease-out-expo",
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
                        className="h-10 w-20 rounded-md border border-border bg-bg-elevated px-2 text-right text-sm tabular-nums text-text-primary focus:border-accent focus:outline-none"
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
