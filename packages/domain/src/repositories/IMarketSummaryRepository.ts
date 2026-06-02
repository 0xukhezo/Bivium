import type { MarketSummary } from "../entities/MarketSummary.js";

export interface IMarketSummaryRepository {
	/**
	 * One row per curated `(collateral, loan)` pair where `tokens.active = true`,
	 * aggregated as follows:
	 *   - `totalLiquidity` = SUM of unique lender balances of the loan token for
	 *     every lender that ALSO accepts this collateral and is unpaused. Each
	 *     lender counts once per pair even if they have multiple rates.
	 *   - `totalBorrowed`  = SUM of `markets.total_borrow_assets` across all
	 *     Bivium markets for the pair (active positions).
	 *   - `bestRatePerSecond` = MIN of `lender_rates.rate_per_second` among
	 *     lenders with positive balance (so the rate is actually fillable).
	 *     `null` when no offer is currently fillable.
	 *
	 * Returns the empty list when the indexer schema is unreachable or empty.
	 */
	listActivePairs(chainId: number): Promise<MarketSummary[]>;
}
