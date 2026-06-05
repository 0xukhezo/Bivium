"use client";

import { BiviumProfileAbi } from "@/lib/contracts";
import { annualRateToRatePerSecond } from "@/lib/utils";
import { useEmbeddedAddress } from "./useEmbeddedAddress";
import { useEmbeddedWriteContract } from "./useEmbeddedWriteContract";

export {
  annualRateToRatePerSecond,
  ratePerSecondToAnnual,
} from "@/lib/utils";

export function useSetRate() {
  const address = useEmbeddedAddress();
  const write = useEmbeddedWriteContract();

  const setRate = (loanToken: `0x${string}`, annualRate: number) => {
    if (!address) throw new Error("Embedded wallet not ready");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "setRate",
      args: [loanToken, annualRateToRatePerSecond(annualRate)],
    });
  };

  return {
    setRate,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}

export function useSetAllowedCollaterals() {
  const address = useEmbeddedAddress();
  const write = useEmbeddedWriteContract();

  const setAllowedCollaterals = (collaterals: readonly `0x${string}`[]) => {
    if (!address) throw new Error("Embedded wallet not ready");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "setAllowedCollaterals",
      args: [collaterals],
    });
  };

  return {
    setAllowedCollaterals,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}

export function useAddAllowedCollateral() {
  const address = useEmbeddedAddress();
  const write = useEmbeddedWriteContract();

  const addAllowedCollateral = (collateral: `0x${string}`) => {
    if (!address) throw new Error("Embedded wallet not ready");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "addAllowedCollateral",
      args: [collateral],
    });
  };

  return {
    addAllowedCollateral,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}

export function useRemoveAllowedCollateral() {
  const address = useEmbeddedAddress();
  const write = useEmbeddedWriteContract();

  const removeAllowedCollateral = (collateral: `0x${string}`) => {
    if (!address) throw new Error("Embedded wallet not ready");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "removeAllowedCollateral",
      args: [collateral],
    });
  };

  return {
    removeAllowedCollateral,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}

export function usePauseProfile() {
  const address = useEmbeddedAddress();
  const write = useEmbeddedWriteContract();

  const pause = () => {
    if (!address) throw new Error("Embedded wallet not ready");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "pause",
    });
  };

  return {
    pause,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}

export function useUnpauseProfile() {
  const address = useEmbeddedAddress();
  const write = useEmbeddedWriteContract();

  const unpause = () => {
    if (!address) throw new Error("Embedded wallet not ready");
    write.writeContract({
      address,
      abi: BiviumProfileAbi,
      functionName: "unpause",
    });
  };

  return {
    unpause,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}
