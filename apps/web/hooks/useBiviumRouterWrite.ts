"use client";

import {
  useWaitForTransactionReceipt,
  useWriteContract,
  type ResolvedRegister,
} from "wagmi";
import { BiviumRouterAbi } from "@/lib/contracts";
import { requireAddress } from "@/lib/contracts/addresses";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

const CHAIN_ID = 42161 satisfies ConfiguredChainId; // Arbitrum One

/**
 * Per-market repay item that the Router consumes as part of an atomic
 * multi-market repay. Matches the on-chain ABI exactly: each item carries the
 * full `MarketParams` (the market id is derived deterministically from it),
 * the amounts (`assets` xor `shares` — set one, leave the other zero), and
 * `maxAssetsIn` as the per-fill slippage cap.
 *
 * Source these fields from the borrower's open positions (via the indexer
 * once it's wired) — never construct MarketParams by hand on the client.
 */
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
  maxAssetsIn: bigint;
}

/**
 * Calls BiviumRouter.repay(items[]) — atomic multi-market repay. Requires
 * NEXT_PUBLIC_BIVIUM_ROUTER_ADDRESS to be set.
 */
export function useRepay() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const repay = (items: readonly RepayItem[]) => {
    write.writeContract({
      address: requireAddress("router"),
      abi: BiviumRouterAbi,
      functionName: "repay",
      args: [items],
      chainId: CHAIN_ID,
    });
  };

  return {
    repay,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}
