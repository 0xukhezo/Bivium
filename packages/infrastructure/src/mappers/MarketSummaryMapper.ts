import { MarketSummary } from "@bivium/domain";

/**
 * Raw shape returned by the aggregation query. All numeric columns arrive as
 * text (cast in SQL) because Postgres `numeric(78,0)` exceeds bigint range
 * and Prisma decodes it to `Decimal` by default — going via text keeps the
 * mapper simple and bigint-safe.
 *
 * Column names are snake_case to match the SQL aliases.
 */
export interface RawMarketSummaryRow {
	collateral: string;
	loan: string;
	lltv: string;
	total_liquidity: string;
	total_borrowed: string;
	best_rate_per_second: string | null;
}

export function mapRawRowToMarketSummary(
	row: RawMarketSummaryRow,
): MarketSummary {
	return new MarketSummary({
		collateral: row.collateral,
		loan: row.loan,
		lltv: BigInt(row.lltv),
		totalLiquidity: BigInt(row.total_liquidity),
		totalBorrowed: BigInt(row.total_borrowed),
		bestRatePerSecond:
			row.best_rate_per_second !== null
				? BigInt(row.best_rate_per_second)
				: null,
	});
}
