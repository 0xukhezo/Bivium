"use client";

import { useState } from "react";
import { useAccount, useDisconnect, useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectModal } from "./ConnectModal";
import { useMounted } from "@/hooks/useMounted";
import { truncateAddress } from "@/lib/utils";

export function ConnectButton() {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address) },
  });

  if (!mounted) {
    return (
      <Button variant="primary" size="md" disabled aria-hidden>
        Connect Wallet
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <>
        <Button variant="primary" size="md" onClick={() => setOpen(true)}>
          Connect Wallet
        </Button>
        <ConnectModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const label = ensName ?? truncateAddress(address);

  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-flex h-10 items-center gap-2 rounded-pill border border-border bg-bg-elevated px-3 text-sm font-mono text-text-primary tabular-nums"
        aria-label={`Connected as ${address}`}
        title={address}
      >
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        {label}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-text-secondary hover:bg-bg-elevated hover:text-danger transition-colors duration-base ease-out-expo"
        aria-label="Disconnect wallet"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
