"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useAccount, useDisconnect, useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { useMounted } from "@/hooks/useMounted";
import { Logo } from "./Logo";
import { cn, truncateAddress } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: "/market", label: "Market" },
  { href: "/dashboard", label: "Dashboard" },
];

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const pathname = usePathname();
  const walletMounted = useMounted();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address) },
  });
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const isDark = (walletMounted ? resolvedTheme : "dark") === "dark";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-40 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-arb-midnight/70 backdrop-blur-md transition-opacity duration-slow ease-out-expo",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
        className={cn(
          "absolute right-0 top-0 flex h-dvh w-3/4 max-w-sm flex-col border-l border-border bg-bg-elevated shadow-card",
          "transition-transform duration-slow ease-out-expo",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-6">
          <Logo />
          <IconButton aria-label="Close menu" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <nav
          aria-label="Mobile primary"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-md px-4 py-3 text-base font-medium transition-colors duration-base ease-out-expo",
                  active
                    ? "bg-bg-sunken text-accent"
                    : "text-text-secondary hover:bg-bg-sunken hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border p-4">
          {walletMounted && isConnected && address ? (
            <span
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-bg px-4 font-mono text-sm text-text-primary tabular-nums"
              aria-label={`Connected as ${address}`}
              title={address}
            >
              <span
                className="h-2 w-2 rounded-full bg-success"
                aria-hidden="true"
              />
              {ensName ?? truncateAddress(address)}
            </span>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setConnectOpen(true)}
              disabled={!walletMounted}
            >
              Connect Wallet
            </Button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-bg text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:border-accent hover:text-text-primary"
            >
              {walletMounted && isDark ? (
                <Sun size={16} aria-hidden="true" />
              ) : (
                <Moon size={16} aria-hidden="true" />
              )}
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
            {walletMounted && isConnected ? (
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-bg text-sm font-medium text-text-secondary transition-colors duration-base ease-out-expo hover:border-danger hover:text-danger"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Disconnect</span>
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
    </div>,
    document.body,
  );
}

interface MobileMenuTriggerProps {
  onClick: () => void;
  open: boolean;
}

export function MobileMenuTrigger({ onClick, open }: MobileMenuTriggerProps) {
  return (
    <IconButton
      aria-label="Open menu"
      aria-expanded={open}
      onClick={onClick}
      className="md:hidden"
    >
      <Menu size={20} />
    </IconButton>
  );
}
