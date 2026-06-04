/**
 * HTTP response shape for `GET /api/v1/lenders/:address/markets`.
 *
 * Shared with the frontend via `@bivium/common/dtos`. `bigint` values are
 * serialised as strings; the frontend widens them back via `BigInt(str)`.
 */

import type { MarketTokenInfoDto } from "./MarketSummaryDto.js";

export type LenderMarketStatusDto = "active" | "paused";

export interface LenderMarketRowDto {
	/** bytes32 market id from the indexer. */
	marketId: string;
	collateral: MarketTokenInfoDto;
	loan: MarketTokenInfoDto;
	/** 1e18 fixed-point. */
	lltv: string;
	/** SUM(positions.collateral), collateral-token base units. */
	collateralAmount: string;
	/** `markets.total_borrow_assets`, loan-token base units. */
	onLoanAmount: string;
	/** USD value of `collateralAmount`. `null` when no price is available. */
	collateralUsd: number | null;
	/** USD value of `onLoanAmount`. `null` when no price is available. */
	onLoanUsd: number | null;
	/** Annualised rate, 0–1 fraction (e.g. `0.0475` ≈ 4.75 %). */
	apy: number;
	status: LenderMarketStatusDto;
}

export interface LenderMarketsListDto {
	chainId: number;
	lender: string;
	rows: LenderMarketRowDto[];
}
