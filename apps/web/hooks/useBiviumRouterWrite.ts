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

// Router's `ClosePositionItem` — repays then withdraws collateral in a
// single atomic tx. Use shares-mode (`assets=0`, `shares=borrowShares`)
// when closing a position so the repay zeroes the debt regardless of
// interest that accrued between the indexer read and execution;
// otherwise `withdrawCollateral` reverts on the HF check.
export interface ClosePositionItem {
  params: MarketParams;
  assets: bigint;
  shares: bigint;
  /** Loan-token base units the Router is allowed to pull. */
  maxAssetsIn: bigint;
  /** Collateral base units to withdraw after the repay. */
  collateralAmount: bigint;
}

export function useClosePosition() {
  const write = useEmbeddedWriteContract();

  const closePosition = (items: readonly ClosePositionItem[]) => {
    write.writeContract({
      address: requireAddress("router"),
      abi: BiviumRouterAbi,
      functionName: "closePosition",
      args: [items],
    });
  };

  return {
    closePosition,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}

// Router's BorrowOrder struct (see BiviumRouter.sol). The Router walks
// `candidates` in order, drawing each lender's available size at their
// `ratePerSecond` until `loanAmount` is filled. Pulls `collateralAmount`
// from msg.sender (requires ERC-20 approval).
export interface BorrowOrderCandidate {
  creator: `0x${string}`;
  /** 1e18 fixed-point. */
  ratePerSecond: bigint;
}

export interface BorrowOrder {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  /** Loan-token base units. */
  loanAmount: bigint;
  /** Collateral-token base units. */
  collateralAmount: bigint;
  /** 1e18 fixed-point per-second, derived from the user's slippage cap. */
  maxAvgRatePerSecond: bigint;
  /** 1e18 fixed-point. */
  minHealthFactor: bigint;
  candidates: readonly BorrowOrderCandidate[];
}

export function useBorrow() {
  const write = useEmbeddedWriteContract();

  const borrow = (order: BorrowOrder) => {
    write.writeContract({
      address: requireAddress("router"),
      abi: BiviumRouterAbi,
      functionName: "borrow",
      args: [order],
    });
  };

  return {
    borrow,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}
