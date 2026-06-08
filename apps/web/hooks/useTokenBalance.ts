"use client";

import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, type ResolvedRegister } from "wagmi";
import type { Token } from "@/lib/tokens";
import { useEmbeddedAddress } from "./useEmbeddedAddress";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

export interface TokenBalance {
  amount: number;
  raw: bigint;
  isLoading: boolean;
  isConnected: boolean;
}

// Prefer the Privy embedded wallet address as the balance source —
// that's the wallet our writes are signed from, so the balance read must
// match. `useAccount()` can lag the embedded-wallet sync after chain
// switches or on initial mount, which surfaces as "wallet only holds
// 0.00 LINK" even though the on-chain balance is non-zero. Fall back to
// wagmi's active wallet for users who connected an external wallet
// rather than the Privy embedded one.
export function useTokenBalance(token: Token | null | undefined): TokenBalance {
  const account = useAccount();
  const embedded = useEmbeddedAddress();
  const address = embedded ?? account.address;
  const enabled = Boolean(address && token);

  const { data, isLoading } = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: token?.chainId as ConfiguredChainId | undefined,
    query: { enabled },
  });

  const raw = data ?? 0n;
  const amount = token ? Number(formatUnits(raw, token.decimals)) : 0;

  return {
    amount,
    raw,
    isLoading: enabled && isLoading,
    isConnected: account.isConnected || Boolean(embedded),
  };
}
