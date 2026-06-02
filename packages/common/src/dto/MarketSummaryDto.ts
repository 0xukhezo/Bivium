/**
 * HTTP response shape for `GET /api/v1/markets`.
 *
 * Shared with the frontend via `@bivium/common/dtos`. `bigint` values are
 * serialised as strings (JSON.stringify can't handle them natively); the
 * frontend widens them back to bigint at the seam via `BigInt(str)`.
 */

export interface MarketTokenInfoDto {
	address: string;
	symbol: string;
	name: string | null;
	decimals: number;
	logoUrl: string | null;
	priceUsd: number | null;
}

export interface MarketSummaryDto {
	collateral: MarketTokenInfoDto;
	loan: MarketTokenInfoDto;
	/** 1e18 fixed-point. */
	lltv: string;
	/** Loan-token base units, summed across markets. */
	totalLiquidity: string;
	totalBorrowed: string;
	/** MIN(ratePerSecond) among markets with available liquidity. */
	bestRatePerSecond: string | null;
}

export interface MarketsListDto {
	chainId: number;
	rows: MarketSummaryDto[];
}
