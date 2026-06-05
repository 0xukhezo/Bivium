"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBorrowerLoans } from "@/lib/api/borrowers";

export function useBorrowerLoans(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["borrower-loans", address ?? "none"],
    queryFn: ({ signal }) => fetchBorrowerLoans(address as string, { signal }),
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
