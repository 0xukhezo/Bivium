"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchMarketDepth } from "@/lib/api/market-depth";

export function useMarketDepth(
  collateral: `0x${string}` | undefined,
  loan: `0x${string}` | undefined,
) {
  return useQuery({
    queryKey: [
      "market-depth",
      collateral?.toLowerCase() ?? "none",
      loan?.toLowerCase() ?? "none",
    ],
    queryFn: ({ signal }) =>
      fetchMarketDepth(collateral as string, loan as string, { signal }),
    enabled: Boolean(collateral && loan),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}
