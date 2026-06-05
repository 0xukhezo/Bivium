"use client";

import { erc20Abi } from "viem";
import { useReadContract, type ResolvedRegister } from "wagmi";
import { useEmbeddedAddress } from "./useEmbeddedAddress";
import type { Token } from "@/lib/tokens";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

export interface TokenAllowance {
  /** Current allowance owner→spender, raw base units. `0n` while loading. */
  allowance: bigint;
  isLoading: boolean;
  refetch: () => void;
}

export function useTokenAllowance(
  token: Token | null | undefined,
  spender: `0x${string}` | undefined,
): TokenAllowance {
  const owner = useEmbeddedAddress();
  const enabled = Boolean(owner && token && spender);

  const { data, isLoading, refetch } = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    chainId: token?.chainId as ConfiguredChainId | undefined,
    query: { enabled },
  });

  return {
    allowance: (data ?? 0n) as bigint,
    isLoading: enabled && isLoading,
    refetch: () => {
      void refetch();
    },
  };
}
