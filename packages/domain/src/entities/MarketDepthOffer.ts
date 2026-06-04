/**
 * A single fillable offer one lender contributes to a `(collateral, loan)`
 * pair's depth chart. One step in the borrow-impact curve = one
 * `MarketDepthOffer`.
 *
 * Bivium is JIT: lenders don't pre-supply, they keep loan-token liquidity in
 * their EOA. So the offer "size" is the lender's wallet balance of the loan
 * token — kept fresh by the Alchemy watcher → reactor pipeline in
 * `public.user_current_balances`. An offer with `size = 0` is not fillable
 * and should never be surfaced as a step.
 *
 * `ratePerSecond` is the raw 1e18 fixed-point rate from `lender_rates`; the
 * application layer derives APY for display. PK on the indexer side is
 * `(lender, loanToken)`, so a lender contributes at most one offer per pair.
 */
export interface MarketDepthOfferProps {
	lender: string;
	ratePerSecond: bigint;
	size: bigint;
}

export class MarketDepthOffer implements MarketDepthOfferProps {
	public readonly lender: string;
	public readonly ratePerSecond: bigint;
	public readonly size: bigint;

	constructor(props: MarketDepthOfferProps) {
		this.lender = props.lender.toLowerCase();
		this.ratePerSecond = props.ratePerSecond;
		this.size = props.size;
	}
}
