"use client";

import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, type ResolvedRegister } from "wagmi";
import type { Token } from "@/lib/tokens";

// Union of chain ids configured in wagmiConfig (e.g. 1 | 42161 | 421614).
type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

export interface TokenBalance {
  /** Human-readable balance (token units). 0 when disconnected or unread. */
  amount: number;
  /** Raw on-chain value in base units. */
  raw: bigint;
  isLoading: boolean;
  isConnected: boolean;
}

/**
 * Reads the connected wallet's ERC-20 balance of `token` on the token's chain.
 * wagmi v2's useBalance is native-only, so ERC-20 reads go through balanceOf.
 * Note: "ETH" in our registry is WETH (an ERC-20), so this reads the WETH
 * balance — native ETH is not special-cased.
 */
export function useTokenBalance(token: Token | null | undefined): TokenBalance {
  const { address, isConnected } = useAccount();
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

  return { amount, raw, isLoading: enabled && isLoading, isConnected };
}
