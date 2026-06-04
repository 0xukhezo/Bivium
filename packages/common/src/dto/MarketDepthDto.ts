/**
 * HTTP response shape for `GET /api/v1/markets/:collateral/:loan/depth`.
 *
 * Shared with the frontend via `@bivium/common/dtos`. `bigint` values are
 * serialised as strings; the frontend widens them back via `BigInt(str)`.
 */

import type { MarketTokenInfoDto } from "./MarketSummaryDto.js";

export interface MarketDepthStepDto {
	/** Lender EOA (lowercased). One step = one lender's fillable offer. */
	lender: string;
	/** Raw 1e18 fixed-point rate. */
	ratePerSecond: string;
	/** Annualised rate, 0–1 fraction (e.g. `0.045` ≈ 4.5 %). */
	apy: number;
	/** Lender's fillable size, loan-token base units. */
	size: string;
	/** USD value of `size`. `null` when the loan token has no price. */
	sizeUsd: number | null;
	/** Running SUM of `size` through this step. */
	cumulativeSize: string;
	/** Running SUM of `sizeUsd`. `null` when the loan token has no price. */
	cumulativeSizeUsd: number | null;
	/**
	 * Size-weighted average APY a borrower would pay if they borrowed exactly
	 * `cumulativeSize`. `null` only defensively.
	 */
	cumulativeAvgApy: number | null;
}

export interface MarketDepthDto {
	chainId: number;
	collateral: MarketTokenInfoDto;
	loan: MarketTokenInfoDto;
	/** 1e18 fixed-point. Protocol-curated for this pair. */
	lltv: string;
	/** SUM of every step's `size`. `"0"` when no fillable offers. */
	totalAvailable: string;
	/** SUM of every step's `sizeUsd`. `null` when the loan token has no price. */
	totalAvailableUsd: number | null;
	steps: MarketDepthStepDto[];
}
