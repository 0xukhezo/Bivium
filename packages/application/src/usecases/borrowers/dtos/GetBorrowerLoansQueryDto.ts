export type GetBorrowerLoansQueryInputDto = {
	/** Borrower EOA. Will be lowercased before hitting the indexer. */
	borrower: string;
	/** Chain to resolve asset metadata from. Defaults to 42161 (Arbitrum One). */
	chainId?: number;
};

export interface BorrowerLoanTokenInfoDto {
	address: string;
	symbol: string;
	name: string | null;
	decimals: number;
	logoUrl: string | null;
	priceUsd: number | null;
}

/**
 * One open position the borrower holds in a specific Bivium market. Each
 * `BorrowerLoanRowDto` aggregates 1..N of these (one per market the borrower
 * has hit in the same `(collateralToken, loanToken)` pair).
 *
 * `borrowShares`, `debtAmount` and `collateralAmount` are kept as `bigint`
 * here; the wire-layer mapper stringifies them.
 */
export interface BorrowerLoanPositionDto {
	/** bytes32 market id from the indexer. */
	marketId: string;
	/** `markets.creator` — the lender whose pool-per-lender market this is. */
	lender: string;
	/** Part of the Morpho `MarketParams` tuple the FE needs to build a Repay tx. */
	oracle: string;
	/** Fixed rate this market was created with, raw 1e18 fixed-point. */
	ratePerSecond: bigint;
	/** Annualised rate as a 0–1 fraction (e.g. `0.0475` ≈ 4.75 %). */
	apy: number;
	/** Morpho borrow shares — the raw Morpho accounting unit. */
	borrowShares: bigint;
	/**
	 * `borrowShares * totalBorrowAssets / totalBorrowShares` (floor) — current
	 * debt in loan-token base units, matches Morpho's `expectedBorrowAssets`.
	 */
	debtAmount: bigint;
	/** Borrower collateral in this market, base units. */
	collateralAmount: bigint;
	/** USD value of `debtAmount`. `null` when no loan-token price is available. */
	debtUsd: number | null;
	/** USD value of `collateralAmount`. `null` when no collateral price is available. */
	collateralUsd: number | null;
	/**
	 * `(collateralUsd * lltv / 1e18) / debtUsd`. `null` when either USD value is
	 * missing or `debtUsd == 0`. Uses indexed off-chain prices, so drifts vs
	 * the on-chain oracle — acceptable for the dashboard, NOT for liquidation
	 * decisions.
	 */
	healthFactor: number | null;
}

export interface BorrowerLoanRowDto {
	/**
	 * Stable identifier per `(collateral, loan)` pair for the FE — both
	 * addresses lower-cased, dash-joined. The borrower can have at most one
	 * row per pair.
	 */
	pairKey: string;
	collateral: BorrowerLoanTokenInfoDto;
	loan: BorrowerLoanTokenInfoDto;
	/** 1e18 fixed-point. All positions in this pair share the curated `lltv`. */
	lltv: bigint;
	/** SUM(collateralAmount) across positions, base units. */
	totalCollateralAmount: bigint;
	/** SUM(debtAmount) across positions, base units. */
	totalDebtAmount: bigint;
	/** SUM(collateralUsd). `null` if any position is missing the price. */
	totalCollateralUsd: number | null;
	/** SUM(debtUsd). `null` if any position is missing the price. */
	totalDebtUsd: number | null;
	/**
	 * Debt-weighted average APY across positions:
	 * `SUM(apy_i * debtAmount_i) / SUM(debtAmount_i)`. `null` when the
	 * denominator is 0 (collateral-only edge case, shouldn't happen since rows
	 * are filtered by `borrowShares > 0`).
	 */
	weightedApy: number | null;
	/**
	 * `min(healthFactor_i)` over non-null position HFs. `null` only when ALL
	 * positions in the pair are missing the HF (no prices), so the row badge
	 * has nothing to colour.
	 */
	lowestHealthFactor: number | null;
	positions: BorrowerLoanPositionDto[];
}

export type GetBorrowerLoansQueryOutputDto = {
	chainId: number;
	borrower: string;
	rows: BorrowerLoanRowDto[];
};
