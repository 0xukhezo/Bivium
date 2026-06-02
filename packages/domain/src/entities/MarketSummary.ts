/**
 * Aggregated orderbook view of a curated `(collateral, loan)` pair. In Bivium
 * each market is keyed by `(creator, pair, rate)` and lenders hold supply in
 * their own EOA (JIT model with auto-forward), so the orderbook surface is
 * derived from active offers + wallet balances, not from supply positions:
 *
 *   - `totalLiquidity` = SUM of unique lender wallet balances of the loan
 *     token across lenders who offer this pair (rate > 0, collateral
 *     whitelisted, profile unpaused). Each lender contributes once per pair.
 *   - `totalBorrowed`  = SUM of `markets.total_borrow_assets` across every
 *     Bivium market for the pair — i.e. positions actually open.
 *   - `bestRatePerSecond` = MIN rate among lenders with positive balance
 *     (offers that can actually be filled). `null` when no offer is fillable.
 *
 * `lltv` is the protocol-curated value from `indexer.tokens` — same for every
 * market on a given pair.
 */
export interface MarketSummaryProps {
	collateral: string;
	loan: string;
	lltv: bigint;
	totalLiquidity: bigint;
	totalBorrowed: bigint;
	bestRatePerSecond: bigint | null;
}

export class MarketSummary implements MarketSummaryProps {
	public readonly collateral: string;
	public readonly loan: string;
	public readonly lltv: bigint;
	public readonly totalLiquidity: bigint;
	public readonly totalBorrowed: bigint;
	public readonly bestRatePerSecond: bigint | null;

	constructor(props: MarketSummaryProps) {
		this.collateral = props.collateral.toLowerCase();
		this.loan = props.loan.toLowerCase();
		this.lltv = props.lltv;
		this.totalLiquidity = props.totalLiquidity;
		this.totalBorrowed = props.totalBorrowed;
		this.bestRatePerSecond = props.bestRatePerSecond;
	}
}
