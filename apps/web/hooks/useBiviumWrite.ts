"use client";

import { BiviumAbi } from "@/lib/contracts";
import { requireAddress } from "@/lib/contracts/addresses";
import { useEmbeddedWriteContract } from "./useEmbeddedWriteContract";

// `Bivium.setAuthorization(authorized, newIsAuthorized)` grants
// `authorized` permission to call on-behalf-of msg.sender operations
// (`supply(onBehalf)`, `borrow(onBehalf)`, `supplyCollateral(onBehalf)`,
// etc.) on the Bivium core. The borrower needs to authorize the Router
// once before borrowing — otherwise `Router.borrow` reverts with
// `NotAuthorized()`. Lenders do NOT need to authorize: `Profile.
// fulfillBorrow` gates on `msg.sender == ROUTER` directly and runs in
// the lender's own EOA via EIP-7702, so its `supply(onBehalf=self)`
// call is implicitly authorized.
export function useSetBiviumAuthorization() {
  const write = useEmbeddedWriteContract();

  const setAuthorization = (
    authorized: `0x${string}`,
    newIsAuthorized: boolean,
  ) => {
    write.writeContract({
      address: requireAddress("bivium"),
      abi: BiviumAbi,
      functionName: "setAuthorization",
      args: [authorized, newIsAuthorized],
    });
  };

  return {
    setAuthorization,
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
  };
}
