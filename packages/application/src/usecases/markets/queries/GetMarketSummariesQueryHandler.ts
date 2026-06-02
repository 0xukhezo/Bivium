import {
	DOMAIN_TYPES,
	type IAssetPriceRepository,
	type IAssetRepository,
	type IMarketSummaryRepository,
	type Asset,
	type AssetPrice,
	type MarketSummary,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	GetMarketSummariesQueryInputDto,
	GetMarketSummariesQueryOutputDto,
	MarketSummaryRowDto,
	MarketTokenInfoDto,
} from "../dtos/GetMarketSummariesQueryDto.js";

const DEFAULT_CHAIN_ID = 42161;

@injectable()
@injectFromBase()
export class GetMarketSummariesQueryHandler extends BaseUseCase<
	GetMarketSummariesQueryInputDto,
	GetMarketSummariesQueryOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.MarketSummaryRepository)
		private readonly marketRepository: IMarketSummaryRepository,
		@inject(DOMAIN_TYPES.AssetRepository)
		private readonly assetRepository: IAssetRepository,
		@inject(DOMAIN_TYPES.AssetPriceRepository)
		private readonly assetPriceRepository: IAssetPriceRepository,
	) {
		super();
	}

	async execute(
		input: GetMarketSummariesQueryInputDto,
	): Promise<GetMarketSummariesQueryOutputDto> {
		const chainId = input.chainId ?? DEFAULT_CHAIN_ID;

		const summaries = await this.marketRepository.listActivePairs(chainId);
		if (summaries.length === 0) {
			return { chainId, rows: [] };
		}

		const addresses = uniqueAddresses(summaries);
		const assets = await this.assetRepository.findManyByAddresses({
			chainId,
			addresses,
		});
		const assetsByAddress = new Map(
			assets
				.filter((a): a is Asset & { address: string } => a.address !== null)
				.map((a) => [a.address.toLowerCase(), a]),
		);

		const prices = await this.assetPriceRepository.findByAssetIds(
			assets.map((a) => a.id),
		);
		const pricesByAssetId = new Map<string, AssetPrice>(
			prices.map((p) => [p.assetId, p]),
		);

		const rows: MarketSummaryRowDto[] = summaries.map((summary) => ({
			collateral: tokenInfo(
				summary.collateral,
				assetsByAddress,
				pricesByAssetId,
			),
			loan: tokenInfo(summary.loan, assetsByAddress, pricesByAssetId),
			lltv: summary.lltv,
			totalLiquidity: summary.totalLiquidity,
			totalBorrowed: summary.totalBorrowed,
			bestRatePerSecond: summary.bestRatePerSecond,
		}));

		return { chainId, rows };
	}
}

function uniqueAddresses(summaries: MarketSummary[]): string[] {
	const set = new Set<string>();
	for (const s of summaries) {
		set.add(s.collateral);
		set.add(s.loan);
	}
	return [...set];
}

function tokenInfo(
	address: string,
	assets: Map<string, Asset>,
	prices: Map<string, AssetPrice>,
): MarketTokenInfoDto {
	const asset = assets.get(address.toLowerCase());
	if (!asset) {
		// Address indexed but no Asset row seeded — surface raw address so the FE
		// can at least render the slot. Re-run the seed to fix.
		return {
			address,
			symbol: address.slice(0, 6),
			name: null,
			decimals: 18,
			logoUrl: null,
			priceUsd: null,
		};
	}
	const price = prices.get(asset.id);
	return {
		address: asset.address ?? address,
		symbol: asset.symbol,
		name: asset.name,
		decimals: asset.decimals,
		logoUrl: asset.logoUrl,
		priceUsd: price ? price.priceUsd : null,
	};
}
