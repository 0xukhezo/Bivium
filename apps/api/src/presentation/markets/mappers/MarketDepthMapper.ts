import type {
	GetMarketDepthQueryOutputDto,
	MarketDepthStepDto as HandlerStepDto,
	MarketDepthTokenInfoDto as HandlerTokenInfoDto,
} from "@bivium/application";
import type {
	MarketDepthDto,
	MarketDepthStepDto,
	MarketTokenInfoDto,
} from "@bivium/common/dtos";

export function mapHandlerOutputToResponse(
	output: GetMarketDepthQueryOutputDto,
): MarketDepthDto {
	return {
		chainId: output.chainId,
		collateral: mapToken(output.collateral),
		loan: mapToken(output.loan),
		lltv: output.lltv.toString(),
		totalAvailable: output.totalAvailable.toString(),
		totalAvailableUsd: output.totalAvailableUsd,
		steps: output.steps.map(mapStep),
	};
}

function mapStep(step: HandlerStepDto): MarketDepthStepDto {
	return {
		lender: step.lender,
		ratePerSecond: step.ratePerSecond.toString(),
		apy: step.apy,
		size: step.size.toString(),
		sizeUsd: step.sizeUsd,
		cumulativeSize: step.cumulativeSize.toString(),
		cumulativeSizeUsd: step.cumulativeSizeUsd,
		cumulativeAvgApy: step.cumulativeAvgApy,
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
