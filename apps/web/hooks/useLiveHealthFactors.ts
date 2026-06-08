"use client";

import { useMemo } from "react";
import { useBlockNumber, useReadContracts } from "wagmi";
import type { ResolvedRegister } from "wagmi";
import { IOracleAbi } from "@/lib/contracts/abis/IOracleAbi";
import type { BorrowerLoan } from "@/lib/borrower";

type ConfiguredChainId = ResolvedRegister["config"]["chains"][number]["id"];

const CHAIN_ID: ConfiguredChainId = 42161;
const ORACLE_SCALE = 10n ** 36n;

export interface LiveHealthFactors {
  /**
   * Live HF per loan id, computed from on-chain oracle prices. Falls back
   * to the loan's indexer-derived `healthFactor` for any row whose oracle
   * read failed or returned 0.
   */
  byId: ReadonlyMap<string, number | null>;
  isLoading: boolean;
}

/**
 * Batches one `IOracle.price()` read per loan and recomputes the health
 * factor entirely on-chain:
 *
 *   HF = (collateral × price × LLTV) / (debt × 1e36 × 1e18)
 *
 * Returns a map keyed by `loan.id` so callers can override the indexer's
 * stale snapshot. We watch the block number so HF refreshes as new blocks
 * land — important when oracle prices tick.
 */
export function useLiveHealthFactors(
  loans: readonly BorrowerLoan[],
): LiveHealthFactors {
  // Watch chain head — every new block re-runs the `price()` reads so the
  // displayed HF tracks oracle movement.
  const blockNumber = useBlockNumber({ chainId: CHAIN_ID, watch: true });

  const { data, isLoading } = useReadContracts({
    contracts: loans.map((l) => ({
      address: l.oracle,
      abi: IOracleAbi,
      functionName: "price" as const,
      chainId: CHAIN_ID,
    })),
    query: { enabled: loans.length > 0 },
    // Force a re-read when the block number changes (cheap — the reads
    // are batched in a single multicall by wagmi).
    blockNumber: blockNumber.data,
  });

  const byId = useMemo(() => {
    const map = new Map<string, number | null>();
    loans.forEach((loan, i) => {
      const result = data?.[i];
      if (!result || result.status !== "success") {
        map.set(loan.id, loan.healthFactor);
        return;
      }
      const price = result.result as bigint;
      const debt = loan.principal.amount + loan.accruedInterest.amount;
      if (debt === 0n || price === 0n) {
        map.set(loan.id, loan.healthFactor);
        return;
      }
      // `hf18` is HF × 1e18. The LLTV's own 1e18 scale is absorbed into
      // the final divisor below (Number(hf18) / 1e18).
      const hf18 =
        (loan.collateral.amount * price * loan.lltv) /
        (debt * ORACLE_SCALE);
      map.set(loan.id, Number(hf18) / 1e18);
    });
    return map;
  }, [loans, data]);

  return { byId, isLoading: loans.length > 0 && isLoading };
}
