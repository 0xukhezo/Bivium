"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { ResolvedRegister } from "wagmi";
import { BiviumProfileAbi } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

const CHAIN_ID: ConfiguredChainId = 42161;

/**
 * Reads from the connected wallet's BiviumProfile (the lender's own EOA acting
 * as the ERC-7702 delegate). Returns undefined fields when disconnected.
 */
export function useLenderProfile() {
  const { address, isConnected } = useAccount();
  const enabled = Boolean(address);

  const paused = useReadContract({
    address,
    abi: BiviumProfileAbi,
    functionName: "paused",
    chainId: CHAIN_ID,
    query: { enabled },
  });

  const allowedCollaterals = useReadContract({
    address,
    abi: BiviumProfileAbi,
    functionName: "getAllowedCollaterals",
    chainId: CHAIN_ID,
    query: { enabled },
  });

  return {
    isConnected,
    address,
    paused: paused.data,
    pausedLoading: enabled && paused.isLoading,
    allowedCollaterals: (allowedCollaterals.data ?? []) as readonly `0x${string}`[],
    allowedCollateralsLoading: enabled && allowedCollaterals.isLoading,
    refetch: () => {
      paused.refetch();
      allowedCollaterals.refetch();
    },
  };
}

/**
 * Batch-read the lender's per-token rate. Returns a map keyed by lowercased
 * token address → ratePerSecond (bigint, 0 when unset on chain).
 */
export function useLenderRates(tokens: readonly Token[]) {
  const { address } = useAccount();
  const enabled = Boolean(address) && tokens.length > 0;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: tokens.map((t) => ({
      address,
      abi: BiviumProfileAbi,
      functionName: "getRate",
      args: [t.address],
      chainId: CHAIN_ID,
    })),
    query: { enabled },
  });

  const ratesByAddress = new Map<string, bigint>();
  if (data) {
    tokens.forEach((t, i) => {
      const result = data[i];
      if (result?.status === "success") {
        ratesByAddress.set(
          t.address.toLowerCase(),
          result.result as bigint,
        );
      }
    });
  }

  return {
    ratesByAddress,
    isLoading: enabled && isLoading,
    refetch,
  };
}
