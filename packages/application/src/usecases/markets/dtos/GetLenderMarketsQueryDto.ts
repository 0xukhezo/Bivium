export type GetLenderMarketsQueryInputDto = {
	/** Lender EOA. Will be lowercased before hitting the indexer. */
	lender: string;
	/** Chain to resolve asset metadata from. Defaults to 42161 (Arbitrum One). */
	chainId?: number;
};

export interface LenderMarketTokenInfoDto {
	address: string;
	symbol: string;
	name: string | null;
	decimals: number;
	logoUrl: string | null;
	priceUsd: number | null;
}

export type LenderMarketStatusDto = "active" | "paused";

export interface LenderMarketRowDto {
	/** bytes32 market id from the indexer. */
	marketId: string;
	collateral: LenderMarketTokenInfoDto;
	loan: LenderMarketTokenInfoDto;
	/** 1e18 fixed-point. */
	lltv: bigint;
	/** SUM(positions.collateral) in collateral-token base units. */
	collateralAmount: bigint;
	/** `markets.total_borrow_assets` in loan-token base units. */
	onLoanAmount: bigint;
	/**
	 * USD value of `collateralAmount`. `null` when the collateral asset has no
	 * price (or hasn't been seeded). Computed as
	 * `Number(amount) / 10^decimals * priceUsd`.
	 */
	collateralUsd: number | null;
	/** USD value of `onLoanAmount`, same convention as `collateralUsd`. */
	onLoanUsd: number | null;
	/**
	 * Annualised rate as a 0–1 fraction (e.g. `0.0475` ≈ 4.75 %), derived from
	 * `markets.rate_per_second`. Computed in the application layer so the
	 * dashboard doesn't have to do bigint arithmetic.
	 */
	apy: number;
	/**
	 * Mirrors `lenders.paused`. Pause is global per lender on the contract, so
	 * every row in a given response carries the same value. Surface it per-row
	 * to match the table shape on the dashboard.
	 */
	status: LenderMarketStatusDto;
}

export type GetLenderMarketsQueryOutputDto = {
	chainId: number;
	lender: string;
	rows: LenderMarketRowDto[];
};
