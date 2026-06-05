"use client";

import { useMemo } from "react";
import { getEmbeddedConnectedWallet, useWallets } from "@privy-io/react-auth";

export function useEmbeddedAddress(): `0x${string}` | undefined {
  const { wallets } = useWallets();
  return useMemo(() => {
    const embedded = getEmbeddedConnectedWallet(wallets);
    return embedded?.address as `0x${string}` | undefined;
  }, [wallets]);
}
