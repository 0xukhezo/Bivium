"use client";

import { useReadContract, type ResolvedRegister } from "wagmi";
import { useEmbeddedAddress } from "./useEmbeddedAddress";
import { BiviumAbi, CONTRACT_ADDRESSES } from "@/lib/contracts";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];
const CHAIN_ID: ConfiguredChainId = 42161;

export interface IsAuthorizedResult {
  /** `true` once Bivium core reports the embedded wallet has authorised `authorized`. */
  isAuthorized: boolean;
  isLoading: boolean;
  refetch: () => void;
}

// `Bivium.isAuthorized(authorizer, authorized)` — reads the storage flag
// the core checks before allowing `authorized` to call any `onBehalf=
// authorizer` operation (supply, borrow, supplyCollateral, withdraw,
// withdrawCollateral, repay). Borrowers and lenders need to flip this
// on for the Router before any Router-mediated flow works.
export function useIsBiviumAuthorized(
  authorized: `0x${string}` | undefined,
): IsAuthorizedResult {
  const owner = useEmbeddedAddress();
  const biviumAddress = CONTRACT_ADDRESSES.bivium;
  const enabled = Boolean(owner && authorized && biviumAddress);

  const { data, isLoading, refetch } = useReadContract({
    address: biviumAddress,
    abi: BiviumAbi,
    functionName: "isAuthorized",
    args: owner && authorized ? [owner, authorized] : undefined,
    chainId: CHAIN_ID,
    query: { enabled },
  });

  return {
    isAuthorized: Boolean(data),
    isLoading: enabled && isLoading,
    refetch: () => {
      void refetch();
    },
  };
}
