"use client";

import { BiviumRouterAbi } from "@/lib/contracts";
import { requireAddress } from "@/lib/contracts/addresses";
import { useEmbeddedWriteContract } from "./useEmbeddedWriteContract";

export interface MarketParams {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  ratePerSecond: bigint;
  lltv: bigint;
  creator: `0x${string}`;
}

export interface RepayItem {
  params: MarketParams;
  assets: bigint;
  shares: bigint;
  /** Per-fill slippage cap. */
  maxAssetsIn: bigint;
}

export function useRepay() {
  const write = useEmbeddedWriteContract();

  const repay = (items: readonly RepayItem[]) => {
    write.writeContract({
      address: requireAddress("router"),
      abi: BiviumRouterAbi,
      functionName: "repay",
      args: [items],
    });
  };

  return {
    repay,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}
