/**
 * HTTP response shape for `GET /api/v1/borrowers/:address/loans`.
 *
 * Shared with the frontend via `@bivium/common/dtos`. `bigint` values are
 * serialised as strings; the frontend widens them back via `BigInt(str)`.
 */

import type { MarketTokenInfoDto } from "./MarketSummaryDto.js";

export interface BorrowerLoanPositionDto {
	/** bytes32 market id from the indexer. */
	marketId: string;
	/** `markets.creator` — the lender whose pool-per-lender market this is. */
	lender: string;
	/** Part of the Morpho `MarketParams` tuple the FE needs to build a Repay tx. */
	oracle: string;
	/** Fixed rate this market was created with, raw 1e18 fixed-point. */
	ratePerSecond: string;
	/** Annualised rate, 0–1 fraction (e.g. `0.0475` ≈ 4.75 %). */
	apy: number;
	/** Morpho borrow shares — the raw accounting unit. */
	borrowShares: string;
	/**
	 * `borrowShares * totalBorrowAssets / totalBorrowShares` (floor) — current
	 * debt in loan-token base units (matches Morpho's `expectedBorrowAssets`).
	 */
	debtAmount: string;
	/** Borrower collateral in this market, base units. */
	collateralAmount: string;
	/** USD value of `debtAmount`. `null` when no loan-token price is available. */
	debtUsd: number | null;
	/** USD value of `collateralAmount`. `null` when no collateral price is available. */
	collateralUsd: number | null;
	/**
	 * `(collateralUsd * lltv / 1e18) / debtUsd`. `null` when either USD value
	 * is missing or `debtUsd == 0`. Uses indexed off-chain prices, so drifts
	 * vs the on-chain oracle.
	 */
	healthFactor: number | null;
}

export interface BorrowerLoanRowDto {
	/** `<collateralLower>-<loanLower>` — stable id for the FE. One row per pair. */
	pairKey: string;
	collateral: MarketTokenInfoDto;
	loan: MarketTokenInfoDto;
	/** 1e18 fixed-point. Shared by every position in the pair. */
	lltv: string;
	/** SUM(collateralAmount) across positions, base units. */
	totalCollateralAmount: string;
	/** SUM(debtAmount) across positions, base units. */
	totalDebtAmount: string;
	/** SUM(collateralUsd). `null` when any position is missing the price. */
	totalCollateralUsd: number | null;
	/** SUM(debtUsd). `null` when any position is missing the price. */
	totalDebtUsd: number | null;
	/** Debt-weighted average APY across positions. `null` when total debt is 0. */
	weightedApy: number | null;
	/** `min(healthFactor_i)`. `null` when no position has a computable HF. */
	lowestHealthFactor: number | null;
	positions: BorrowerLoanPositionDto[];
}

export interface BorrowerLoansListDto {
	chainId: number;
	borrower: string;
	rows: BorrowerLoanRowDto[];
}
