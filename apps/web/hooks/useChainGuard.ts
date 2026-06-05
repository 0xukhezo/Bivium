"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { CONTRACTS_CHAIN_ID } from "@/lib/contracts/addresses";

export function useChainGuard() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const needsSwitch =
    isConnected && !!chainId && chainId !== CONTRACTS_CHAIN_ID;

  return {
    needsSwitch,
    isSwitching: isPending,
    chainId,
    targetChainId: CONTRACTS_CHAIN_ID,
    switchChain: () => switchChain({ chainId: CONTRACTS_CHAIN_ID }),
  };
}
