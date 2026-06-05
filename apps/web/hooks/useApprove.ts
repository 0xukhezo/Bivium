"use client";

import { erc20Abi } from "viem";
import type { Token } from "@/lib/tokens";
import { useEmbeddedWriteContract } from "./useEmbeddedWriteContract";

// Writes ERC-20 `approve(spender, amount)` from the Privy embedded wallet.
// Use exact-amount approvals (not `type(uint256).max`) per the policy
// noted in TODO.md.
export function useApprove(
  token: Token | null | undefined,
  spender: `0x${string}` | undefined,
) {
  const write = useEmbeddedWriteContract();

  const approve = (amount: bigint) => {
    if (!token || !spender) return;
    write.writeContract({
      address: token.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    approve,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}
