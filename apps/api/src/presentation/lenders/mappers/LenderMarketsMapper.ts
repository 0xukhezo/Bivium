import type {
	GetLenderMarketsQueryOutputDto,
	LenderMarketRowDto as HandlerRowDto,
	LenderMarketTokenInfoDto as HandlerTokenInfoDto,
} from "@bivium/application";
import type {
	LenderMarketRowDto,
	LenderMarketsListDto,
	MarketTokenInfoDto,
} from "@bivium/common/dtos";

export function mapHandlerOutputToResponse(
	output: GetLenderMarketsQueryOutputDto,
): LenderMarketsListDto {
	return {
		chainId: output.chainId,
		lender: output.lender,
		rows: output.rows.map(mapRow),
	};
}

function mapRow(row: HandlerRowDto): LenderMarketRowDto {
	return {
		marketId: row.marketId,
		collateral: mapToken(row.collateral),
		loan: mapToken(row.loan),
		lltv: row.lltv.toString(),
		collateralAmount: row.collateralAmount.toString(),
		onLoanAmount: row.onLoanAmount.toString(),
		collateralUsd: row.collateralUsd,
		onLoanUsd: row.onLoanUsd,
		apy: row.apy,
		status: row.status,
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
