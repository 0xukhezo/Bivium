import { LenderMarketSummary } from "@bivium/domain";

/**
 * Raw shape returned by the lender-scoped aggregation query. Numeric columns
 * are cast to text in SQL because Postgres `numeric(78,0)` exceeds bigint
 * range; Prisma decodes such values to `Decimal` by default and going via
 * text keeps the mapper simple and bigint-safe.
 */
export interface RawLenderMarketSummaryRow {
	market_id: string;
	collateral: string;
	loan: string;
	lltv: string;
	collateral_amount: string;
	on_loan_amount: string;
	rate_per_second: string;
	paused: boolean;
}

export function mapRawRowToLenderMarketSummary(
	row: RawLenderMarketSummaryRow,
): LenderMarketSummary {
	return new LenderMarketSummary({
		marketId: row.market_id,
		collateral: row.collateral,
		loan: row.loan,
		lltv: BigInt(row.lltv),
		collateralAmount: BigInt(row.collateral_amount),
		onLoanAmount: BigInt(row.on_loan_amount),
		ratePerSecond: BigInt(row.rate_per_second),
		paused: row.paused,
	});
}
