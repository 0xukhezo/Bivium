/**
 * A single position the borrower holds in one Bivium market — i.e. one
 * `(marketId, borrower)` row from the indexer joined with its market record.
 *
 * A Bivium borrow op can fan-out across N markets (one per lender that fills
 * the order), so the "Your loans" dashboard groups these positions by
 * `(collateralToken, loanToken)`. This value object is the per-market leaf;
 * the per-pair aggregation happens in the application layer.
 *
 *   - `borrowShares` is the Morpho share accounting. `debtAmount` (assets) is
 *     derived in the handler as `borrowShares * totalBorrowAssets /
 *     totalBorrowShares` to match Morpho's `expectedBorrowAssets` semantics.
 *   - `collateralAmount` is the borrower's collateral in this specific market,
 *     base units.
 *   - `lltv` / `oracle` are denormalised from the market because they're part
 *     of the `MarketParams` tuple the FE needs to build the Repay tx.
 *   - `ratePerSecond` is the fixed rate this market was created with —
 *     identifies the lender's offer that the Router filled.
 *   - `lender` is `markets.creator` — the EOA whose pool-per-lender market
 *     this is.
 *   - `totalBorrowAssets` / `totalBorrowShares` are snapshots of the market's
 *     Morpho state at read time; the handler uses them to convert shares to
 *     assets and discards them (they don't belong on the wire).
 */
export interface BorrowerLoanPositionProps {
	marketId: string;
	collateralToken: string;
	loanToken: string;
	oracle: string;
	lender: string;
	lltv: bigint;
	ratePerSecond: bigint;
	borrowShares: bigint;
	collateralAmount: bigint;
	totalBorrowAssets: bigint;
	totalBorrowShares: bigint;
}

export class BorrowerLoanPosition implements BorrowerLoanPositionProps {
	public readonly marketId: string;
	public readonly collateralToken: string;
	public readonly loanToken: string;
	public readonly oracle: string;
	public readonly lender: string;
	public readonly lltv: bigint;
	public readonly ratePerSecond: bigint;
	public readonly borrowShares: bigint;
	public readonly collateralAmount: bigint;
	public readonly totalBorrowAssets: bigint;
	public readonly totalBorrowShares: bigint;

	constructor(props: BorrowerLoanPositionProps) {
		this.marketId = props.marketId.toLowerCase();
		this.collateralToken = props.collateralToken.toLowerCase();
		this.loanToken = props.loanToken.toLowerCase();
		this.oracle = props.oracle.toLowerCase();
		this.lender = props.lender.toLowerCase();
		this.lltv = props.lltv;
		this.ratePerSecond = props.ratePerSecond;
		this.borrowShares = props.borrowShares;
		this.collateralAmount = props.collateralAmount;
		this.totalBorrowAssets = props.totalBorrowAssets;
		this.totalBorrowShares = props.totalBorrowShares;
	}
}
