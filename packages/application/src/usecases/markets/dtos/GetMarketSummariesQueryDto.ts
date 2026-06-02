export type GetMarketSummariesQueryInputDto = {
	/** Chain to resolve asset metadata from. Defaults to 42161 (Arbitrum One). */
	chainId?: number;
};

export interface MarketTokenInfoDto {
	address: string;
	symbol: string;
	name: string | null;
	decimals: number;
	logoUrl: string | null;
	priceUsd: number | null;
}

export interface MarketSummaryRowDto {
	collateral: MarketTokenInfoDto;
	loan: MarketTokenInfoDto;
	/** 1e18 fixed-point bigint serialised as decimal string. */
	lltv: bigint;
	/** Sum across markets, in loan-token base units. */
	totalLiquidity: bigint;
	totalBorrowed: bigint;
	/**
	 * MIN(ratePerSecond) among markets with available headroom. `null` when no
	 * market for this pair has any free liquidity to fill against.
	 */
	bestRatePerSecond: bigint | null;
}

export type GetMarketSummariesQueryOutputDto = {
	chainId: number;
	rows: MarketSummaryRowDto[];
};
