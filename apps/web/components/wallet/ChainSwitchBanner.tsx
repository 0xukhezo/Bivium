"use client";

import { TriangleAlert } from "lucide-react";
import { useChainGuard } from "@/hooks/useChainGuard";

// App-wide wrong-chain banner. Lives directly below the AppHeader and
// only renders when the connected wallet is on a chain other than
// Arbitrum (`useChainGuard` already encapsulates the check + the
// `switchChain` call). Per-button `<ChainAwareButton>` still covers
// individual writes; this banner makes the situation visible across
// pages where reads also fail (dashboard tables, market detail, etc.).
export function ChainSwitchBanner() {
  const { needsSwitch, isSwitching, switchChain, chainId } = useChainGuard();

  if (!needsSwitch) return null;

  return (
    <div
      role="alert"
      className="sticky top-[72px] z-20 border-b border-warn/30 bg-warn/10 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-6 py-2 text-sm lg:px-10">
        <TriangleAlert
          size={16}
          className="shrink-0 text-warn"
          aria-hidden="true"
        />
        <p className="flex-1 text-text-secondary">
          You&apos;re on chain {chainId ?? "—"}. Bivium runs on Arbitrum —
          switch network to read live data and send transactions.
        </p>
        <button
          type="button"
          onClick={switchChain}
          disabled={isSwitching}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-warn/40 bg-bg-elevated px-3 text-xs font-medium text-text-primary transition-colors duration-base ease-out-expo hover:border-warn disabled:pointer-events-none disabled:opacity-50"
        >
          {isSwitching ? "Switching…" : "Switch to Arbitrum"}
        </button>
      </div>
    </div>
  );
}
