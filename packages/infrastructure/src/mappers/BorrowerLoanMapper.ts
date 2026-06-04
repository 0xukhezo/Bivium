import { BorrowerLoanPosition } from "@bivium/domain";

/**
 * Raw shape returned by the borrower-scoped position aggregation query.
 * Numeric columns are cast to text in SQL — Postgres `numeric(78,0)` exceeds
 * JS Number safe range and Prisma decodes such values to `Decimal` by
 * default; going via text keeps the mapper simple and bigint-safe.
 */
export interface RawBorrowerLoanPositionRow {
	market_id: string;
	collateral_token: string;
	loan_token: string;
	oracle: string;
	lender: string;
	lltv: string;
	rate_per_second: string;
	borrow_shares: string;
	collateral_amount: string;
	total_borrow_assets: string;
	total_borrow_shares: string;
}

export function mapRawRowToBorrowerLoanPosition(
	row: RawBorrowerLoanPositionRow,
): BorrowerLoanPosition {
	return new BorrowerLoanPosition({
		marketId: row.market_id,
		collateralToken: row.collateral_token,
		loanToken: row.loan_token,
		oracle: row.oracle,
		lender: row.lender,
		lltv: BigInt(row.lltv),
		ratePerSecond: BigInt(row.rate_per_second),
		borrowShares: BigInt(row.borrow_shares),
		collateralAmount: BigInt(row.collateral_amount),
		totalBorrowAssets: BigInt(row.total_borrow_assets),
		totalBorrowShares: BigInt(row.total_borrow_shares),
	});
}
