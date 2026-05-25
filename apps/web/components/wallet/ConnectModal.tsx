"use client";

import type { Connector } from "wagmi";
import { useConnect } from "wagmi";
import { Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

const CONNECTOR_LABELS: Record<string, string> = {
  injected: "Browser wallet",
  metaMaskSDK: "MetaMask",
  metaMask: "MetaMask",
  coinbaseWallet: "Coinbase Wallet",
  coinbaseWalletSDK: "Coinbase Wallet",
  walletConnect: "WalletConnect",
};

function WalletIcon({ connector }: { connector: Connector }) {
  const iconUrl = connector.icon;
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-md object-contain"
      />
    );
  }
  return (
    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-bg-sunken">
      <Wallet size={16} className="text-text-secondary" aria-hidden="true" />
    </div>
  );
}

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const { connectors, connect, status, error } = useConnect();

  return (
    <Modal open={open} onClose={onClose} title="Connect a wallet">
      <p className="mb-4 text-sm text-text-secondary">
        Bivium lives in your EOA. Connect the wallet you want to lend from or borrow with.
      </p>
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => {
          const label = CONNECTOR_LABELS[connector.id] ?? connector.name;
          const pending = status === "pending";
          return (
            <button
              key={connector.uid}
              type="button"
              disabled={pending}
              onClick={() => {
                connect(
                  { connector },
                  {
                    onSuccess: () => onClose(),
                  },
                );
              }}
              className={cn(
                "group flex h-14 w-full items-center gap-3 rounded-md border border-border bg-bg px-4",
                "hover:border-accent hover:shadow-glow-cyan transition-shadow duration-base ease-out-expo",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              <WalletIcon connector={connector} />
              <span className="text-base font-medium text-text-primary">{label}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error.message}
        </p>
      ) : null}
    </Modal>
  );
}
