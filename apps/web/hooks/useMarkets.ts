"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarkets } from "@/lib/api/markets";

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
