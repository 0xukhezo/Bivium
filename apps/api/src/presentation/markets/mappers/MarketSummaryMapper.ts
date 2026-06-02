import type {
	GetMarketSummariesQueryOutputDto,
	MarketSummaryRowDto,
	MarketTokenInfoDto as HandlerTokenInfoDto,
} from "@bivium/application";
import type {
	MarketSummaryDto,
	MarketTokenInfoDto,
	MarketsListDto,
} from "@bivium/common/dtos";

export function mapHandlerOutputToResponse(
	output: GetMarketSummariesQueryOutputDto,
): MarketsListDto {
	return {
		chainId: output.chainId,
		rows: output.rows.map(mapRow),
	};
}

function mapRow(row: MarketSummaryRowDto): MarketSummaryDto {
	return {
		collateral: mapToken(row.collateral),
		loan: mapToken(row.loan),
		lltv: row.lltv.toString(),
		totalLiquidity: row.totalLiquidity.toString(),
		totalBorrowed: row.totalBorrowed.toString(),
		bestRatePerSecond:
			row.bestRatePerSecond !== null ? row.bestRatePerSecond.toString() : null,
	};
}

function mapToken(token: HandlerTokenInfoDto): MarketTokenInfoDto {
	return {
		address: token.address,
		symbol: token.symbol,
		name: token.name,
		decimals: token.decimals,
		logoUrl: token.logoUrl,
		priceUsd: token.priceUsd,
	};
}
