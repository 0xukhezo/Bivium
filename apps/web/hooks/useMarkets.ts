"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarkets } from "@/lib/api/markets";

/**
 * Live markets list. Wraps the `/api/v1/markets` endpoint and adapts the
 * wire-format into the existing `Market` shape so consumers don't change.
 *
 * Returns the full React Query result, so callers can branch on
 * `isLoading` / `isError` / `data` and call `refetch()` for retry. */
export function useMarkets(opts?: { page?: number; pageSize?: number }) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 100;

  return useQuery({
    queryKey: ["markets", page, pageSize],
    queryFn: ({ signal }) => fetchMarkets({ page, pageSize, signal }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
