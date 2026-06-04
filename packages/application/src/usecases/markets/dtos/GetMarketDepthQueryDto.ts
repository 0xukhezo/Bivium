export type GetMarketDepthQueryInputDto = {
	/** Curated collateral token address. Lowercased before hitting the indexer. */
	collateral: string;
	/** Curated loan token address. Lowercased before hitting the indexer. */
	loan: string;
	/** Chain to resolve asset metadata from. Defaults to 42161 (Arbitrum One). */
	chainId?: number;
};

export interface MarketDepthTokenInfoDto {
	address: string;
	symbol: string;
	name: string | null;
	decimals: number;
	logoUrl: string | null;
	priceUsd: number | null;
}

/**
 * One step of the borrow-impact curve = one fillable offer (one lender) for
 * the pair. Steps are ordered by `ratePerSecond ASC` then `size DESC` (the
 * Router's fill order), with cumulative fields computed running over that
 * ordering so step `i` describes the state *after* consuming this offer.
 *
 * `cumulativeSizeUsd` is `null` when the loan token has no price (every step
 * in a response shares the loan token, so this is all-or-nothing per
 * response — but propagated defensively per step).
 *
 * `cumulativeAvgApy` is `SUM(apy_i * size_i) / SUM(size_i)` weighted by
 * loan-token base units, NOT by USD. Base units are comparable because every
 * step shares the loan token, and weighting by USD would propagate `null`
 * when the loan price is missing. `null` only when the running denominator is
 * zero, which the upstream `balance > 0` filter prevents — defensive.
 */
export interface MarketDepthStepDto {
	lender: string;
	/** Raw 1e18 fixed-point rate. */
	ratePerSecond: bigint;
	/** Annualised rate as a 0–1 fraction (e.g. `0.045` ≈ 4.5 %). */
	apy: number;
	/** Lender's fillable size (loan-token base units). */
	size: bigint;
	/** USD value of `size`. `null` when the loan token has no price. */
	sizeUsd: number | null;
	/** Running SUM of `size` through this step (loan-token base units). */
	cumulativeSize: bigint;
	/** Running SUM of `sizeUsd`. `null` when the loan token has no price. */
	cumulativeSizeUsd: number | null;
	/** Size-weighted average APY through this step. `null` only defensively. */
	cumulativeAvgApy: number | null;
}

export type GetMarketDepthQueryOutputDto = {
	chainId: number;
	collateral: MarketDepthTokenInfoDto;
	loan: MarketDepthTokenInfoDto;
	/** 1e18 fixed-point. From `tokens.lltv` — protocol-curated for this pair. */
	lltv: bigint;
	/** SUM of every step's `size`, loan-token base units. `0n` when empty. */
	totalAvailable: bigint;
	/** SUM of every step's `sizeUsd`. `null` when the loan token has no price. */
	totalAvailableUsd: number | null;
	steps: MarketDepthStepDto[];
};
