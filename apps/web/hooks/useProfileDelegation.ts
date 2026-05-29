"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

const DELEGATION_PREFIX = "0xef0100";

/**
 * Reads the EIP-7702 delegation status of the connected wallet.
 *
 * After a successful 7702 set-code tx, `eth_getCode` for the EOA returns a
 * 23-byte designator: `0xef0100 || <20-byte target address>`. We probe that
 * shape and compare the target to our BiviumProfile template.
 */
export function useProfileDelegation() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const profileAddress = CONTRACT_ADDRESSES.profile;

  const queryKey = ["7702-delegation", address ?? "no-account"] as const;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!publicClient || !address) return null;
      const code = await publicClient.getCode({ address });
      if (!code || code === "0x") return null;
      if (!code.toLowerCase().startsWith(DELEGATION_PREFIX)) return null;
      // Strip the 3-byte prefix to get the 20-byte target address (40 hex chars).
      const target = `0x${code.slice(DELEGATION_PREFIX.length)}` as `0x${string}`;
      return target.toLowerCase() as `0x${string}`;
    },
    enabled: Boolean(publicClient && address),
    staleTime: 15_000, // re-poll only on demand (tx success) — chain reads are cheap but we throttle anyway
  });

  const delegatedTo = data ?? null;
  const isDelegated =
    !!delegatedTo &&
    !!profileAddress &&
    delegatedTo === profileAddress.toLowerCase();

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    isConnected,
    address,
    profileAddress,
    isDelegated,
    delegatedTo,
    isLoading: isLoading || isFetching,
    error,
    refetch,
  };
}
