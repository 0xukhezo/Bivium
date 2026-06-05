"use client";

import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, type ResolvedRegister } from "wagmi";
import type { Token } from "@/lib/tokens";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

export interface TokenBalance {
  amount: number;
  raw: bigint;
  isLoading: boolean;
  isConnected: boolean;
}

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
