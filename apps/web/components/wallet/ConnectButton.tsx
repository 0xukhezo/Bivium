"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useBalance } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { Copy, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMounted } from "@/hooks/useMounted";
import { useEmbeddedAddress } from "@/hooks/useEmbeddedAddress";
import { truncateAddress } from "@/lib/utils";

export function ConnectButton() {
  const mounted = useMounted();
  const { ready, authenticated, login, logout } = usePrivy();
  const embedded = useEmbeddedAddress();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!mounted || !ready) {
    return (
      <Button variant="primary" size="md" disabled aria-hidden>
        Sign in
      </Button>
    );
  }

  if (!authenticated || !embedded) {
    return (
      <Button variant="primary" size="md" onClick={login}>
        Sign in
      </Button>
    );
  }

  const label = truncateAddress(embedded);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={embedded}
        className="inline-flex h-10 items-center gap-2 rounded-pill border border-border bg-bg-elevated px-3 text-sm font-mono text-text-primary tabular-nums transition-colors duration-base ease-out-expo hover:border-accent"
      >
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        {label}
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform duration-base ease-out-expo ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <WalletMenu
          address={embedded}
          onCopy={() => navigator.clipboard?.writeText(embedded)}
          onLogout={() => {
            setOpen(false);
            logout();
          }}
        />
      ) : null}
    </div>
  );
}

function WalletMenu({
  address,
  onCopy,
  onLogout,
}: {
  address: `0x${string}`;
  onCopy: () => void;
  onLogout: () => void;
}) {
  const balance = useBalance({
    address,
    chainId: arbitrum.id,
  });

  const [copied, setCopied] = useState(false);
  const onCopyClick = () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-card"
    >
      <div className="px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
          Privy embedded wallet
        </p>
        <button
          type="button"
          onClick={onCopyClick}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-md border border-transparent bg-bg px-3 py-2 text-left text-sm font-mono text-text-primary transition-colors duration-base ease-out-expo hover:border-border"
          aria-label="Copy wallet address"
        >
          <span className="truncate tabular-nums">{truncateAddress(address, 6)}</span>
          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
            {copied ? "Copied" : <Copy size={14} aria-hidden />}
          </span>
        </button>

        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
            Balance · Arbitrum
          </p>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {balance.isLoading
            ? "…"
            : balance.data
              ? `${formatEth(balance.data.value)} ETH`
              : "—"}
        </p>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:bg-bg hover:text-danger"
      >
        <LogOut size={14} aria-hidden />
        Sign out
      </button>
    </div>
  );
}

function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.0001) return "<0.0001";
  return eth.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
