"use client";

import { useEffect } from "react";
import {
  getEmbeddedConnectedWallet,
  useActiveWallet,
  useWallets,
} from "@privy-io/react-auth";

export function EmbeddedWalletActivator() {
  const { wallets } = useWallets();
  const { wallet: active, setActiveWallet } = useActiveWallet();

  useEffect(() => {
    const embedded = getEmbeddedConnectedWallet(wallets);
    if (!embedded) return;
    if (active?.address?.toLowerCase() === embedded.address.toLowerCase()) return;
    setActiveWallet(embedded);
  }, [wallets, active, setActiveWallet]);

  return null;
}
