/**
 * One row of the lender's "Your markets" dashboard view. Each row is a Bivium
 * market the lender owns (`markets.creator == lender`), with the live derived
 * amounts needed to render the table:
 *
 *   - `collateralAmount` = SUM of `positions.collateral` across every borrower
 *     position in this market. Raw collateral-token base units.
 *   - `onLoanAmount` = `markets.total_borrow_assets` — the lender's currently
 *     loaned principal in this market, kept fresh by Borrow / Repay /
 *     AccrueInterest / Liquidate handlers in the indexer.
 *   - `ratePerSecond` = the market's fixed rate, set at CreateMarket. APY is a
 *     pure presentation derivation; the entity keeps the raw on-chain value.
 *   - `paused` = the lender's profile pause flag (`lenders.paused`). It is
 *     global across all of the lender's markets — the per-row shape mirrors the
 *     dashboard UI, every row shares the same value.
 */
export interface LenderMarketSummaryProps {
	marketId: string;
	collateral: string;
	loan: string;
	lltv: bigint;
	collateralAmount: bigint;
	onLoanAmount: bigint;
	ratePerSecond: bigint;
	paused: boolean;
}

export class LenderMarketSummary implements LenderMarketSummaryProps {
	public readonly marketId: string;
	public readonly collateral: string;
	public readonly loan: string;
	public readonly lltv: bigint;
	public readonly collateralAmount: bigint;
	public readonly onLoanAmount: bigint;
	public readonly ratePerSecond: bigint;
	public readonly paused: boolean;

	constructor(props: LenderMarketSummaryProps) {
		this.marketId = props.marketId.toLowerCase();
		this.collateral = props.collateral.toLowerCase();
		this.loan = props.loan.toLowerCase();
		this.lltv = props.lltv;
		this.collateralAmount = props.collateralAmount;
		this.onLoanAmount = props.onLoanAmount;
		this.ratePerSecond = props.ratePerSecond;
		this.paused = props.paused;
	}
}
