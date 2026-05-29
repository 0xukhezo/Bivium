"use client";

import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
  type ResolvedRegister,
} from "wagmi";
import { BiviumProfileAbi } from "@/lib/contracts";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

const CHAIN_ID = 42161 satisfies ConfiguredChainId; // Arbitrum One

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31,536,000

/** Annualized rate (0–1, e.g. 0.05 = 5%) → ratePerSecond as 1e18 fixed point. */
export function annualRateToRatePerSecond(annualRate: number): bigint {
  if (annualRate < 0 || !Number.isFinite(annualRate)) return 0n;
  const scaled = Math.round((annualRate * 1e18) / SECONDS_PER_YEAR);
  return BigInt(scaled);
}

export function ratePerSecondToAnnual(rps: bigint): number {
  return (Number(rps) * SECONDS_PER_YEAR) / 1e18;
}

/**
 * Calls BiviumProfile.setRate(loanToken, ratePerSecond) on the connected
 * wallet's own EOA (it acts as the ERC-7702 delegate). Pass the annualized
 * rate as a 0–1 decimal; we convert to ratePerSecond.
 */
export function useSetRate() {
  const { address } = useAccount();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const setRate = (loanToken: `0x${string}`, annualRate: number) => {
    if (!address) throw new Error("Wallet not connected");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "setRate",
      args: [loanToken, annualRateToRatePerSecond(annualRate)],
      chainId: CHAIN_ID,
    });
  };

  return {
    setRate,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}

/** Bulk-replace the lender's allowed collateral whitelist. */
export function useSetAllowedCollaterals() {
  const { address } = useAccount();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const setAllowedCollaterals = (collaterals: readonly `0x${string}`[]) => {
    if (!address) throw new Error("Wallet not connected");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "setAllowedCollaterals",
      args: [collaterals],
      chainId: CHAIN_ID,
    });
  };

  return {
    setAllowedCollaterals,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}

export function useAddAllowedCollateral() {
  const { address } = useAccount();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const addAllowedCollateral = (collateral: `0x${string}`) => {
    if (!address) throw new Error("Wallet not connected");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "addAllowedCollateral",
      args: [collateral],
      chainId: CHAIN_ID,
    });
  };

  return {
    addAllowedCollateral,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}

export function useRemoveAllowedCollateral() {
  const { address } = useAccount();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const removeAllowedCollateral = (collateral: `0x${string}`) => {
    if (!address) throw new Error("Wallet not connected");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "removeAllowedCollateral",
      args: [collateral],
      chainId: CHAIN_ID,
    });
  };

  return {
    removeAllowedCollateral,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}

/**
 * Pause the lender's bivium — stops new borrows across ALL their markets.
 * The pause flag is global per lender (BiviumProfile.paused), not per-market.
 * Existing positions stay open and keep accruing.
 */
export function usePauseProfile() {
  const { address } = useAccount();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const pause = () => {
    if (!address) throw new Error("Wallet not connected");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "pause",
      chainId: CHAIN_ID,
    });
  };

  return {
    pause,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}

export function useUnpauseProfile() {
  const { address } = useAccount();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: CHAIN_ID,
  });

  const unpause = () => {
    if (!address) throw new Error("Wallet not connected");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "unpause",
      chainId: CHAIN_ID,
    });
  };

  return {
    unpause,
    hash: write.data,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    reset: () => write.reset(),
  };
}
