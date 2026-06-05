"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { useEmbeddedAddress } from "./useEmbeddedAddress";

// EIP-7702 designator prefix: getCode returns `0xef0100 || <20-byte target>`.
const DELEGATION_PREFIX = "0xef0100";

export function useProfileDelegation() {
  const { isConnected } = useAccount();
  const address = useEmbeddedAddress();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const profileAddress = CONTRACT_ADDRESSES.profile;

  const queryKey = ["7702-delegation", address ?? "no-account"] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!publicClient || !address) return { code: null, target: null };
      const code = (await publicClient.getCode({ address })) ?? "0x";
      if (typeof window !== "undefined") {
        console.log("[delegation] address", address, "code", code);
      }
      if (!code || code === "0x")
        return { code, target: null as `0x${string}` | null };
      if (!code.toLowerCase().startsWith(DELEGATION_PREFIX))
        return { code, target: null as `0x${string}` | null };
      const target = `0x${code.slice(DELEGATION_PREFIX.length)}` as `0x${string}`;
      return {
        code,
        target: target.toLowerCase() as `0x${string}`,
      };
    },
    enabled: Boolean(publicClient && address),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const rawCode = data?.code ?? null;
  const delegatedTo = data?.target ?? null;
  const isDelegated =
    !!delegatedTo &&
    !!profileAddress &&
    delegatedTo === profileAddress.toLowerCase();

  // We know the answer when either (a) the query has produced data, or
  // (b) we don't have an address yet (nothing to check). `isLoading` alone
  // is misleading: it stays `false` while the query is disabled.
  const isResolved = data !== undefined || !address;

  const refetch = useCallback(() => {
    queryClient.refetchQueries({ queryKey, exact: true });
  }, [queryClient, queryKey]);

  return {
    isConnected,
    address,
    profileAddress,
    isDelegated,
    delegatedTo,
    rawCode,
    isLoading,
    isResolved,
    error,
    refetch,
  };
}
