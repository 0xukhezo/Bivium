import type { LenderMarketSummary } from "../entities/LenderMarketSummary.js";

export interface ILenderMarketSummaryRepository {
	/**
	 * One row per Bivium market created by this lender (`markets.creator =
	 * lender`). Joins the indexer's `markets`, `positions` (for the collateral
	 * SUM) and `lenders` (for the pause flag).
	 *
	 * Returns the empty list when the lender has no markets yet or when the
	 * indexer schema is unreachable. The lender is matched case-insensitively
	 * (addresses are stored lowercased in the indexer).
	 */
	listByLender(input: {
		lender: string;
		chainId: number;
	}): Promise<LenderMarketSummary[]>;
}
