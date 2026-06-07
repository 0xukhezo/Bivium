"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchLenderMarkets } from "@/lib/api/lenders";

export function useLenderMarkets(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["lender-markets", address ?? "none"],
    queryFn: ({ signal }) => fetchLenderMarkets(address as string, { signal }),
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // Re-renders + address switches keep the previous rows visible while
    // the new fetch runs, so the table never flashes to "Loading…".
    placeholderData: keepPreviousData,
  });
}
