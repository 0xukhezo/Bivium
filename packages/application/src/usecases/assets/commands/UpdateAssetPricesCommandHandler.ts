import {
	DOMAIN_TYPES,
	type IAssetPriceRepository,
	type IAssetRepository,
	type ILiFiPriceFetcher,
	type UpsertAssetPriceInput,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	UpdateAssetPricesCommandInputDto,
	UpdateAssetPricesCommandOutputDto,
} from "../dtos/UpdateAssetPricesCommandDto.js";

const PRICE_SOURCE = "lifi";
const DEFAULT_CHAIN_IDS = [42161];

@injectable()
@injectFromBase()
export class UpdateAssetPricesCommandHandler extends BaseUseCase<
	UpdateAssetPricesCommandInputDto,
	UpdateAssetPricesCommandOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.AssetRepository)
		private readonly assetRepository: IAssetRepository,
		@inject(DOMAIN_TYPES.AssetPriceRepository)
		private readonly assetPriceRepository: IAssetPriceRepository,
		@inject(DOMAIN_TYPES.LiFiPriceFetcher)
		private readonly priceFetcher: ILiFiPriceFetcher,
	) {
		super();
	}

	async execute(
		input: UpdateAssetPricesCommandInputDto,
	): Promise<UpdateAssetPricesCommandOutputDto> {
		// Bivium is Arbitrum-only today; if the caller doesn't restrict, refresh
		// all chains the seed has populated (currently 42161).
		const chainIds =
			input.chainIds && input.chainIds.length > 0
				? [...new Set(input.chainIds)]
				: DEFAULT_CHAIN_IDS;

		let pricesUpdated = 0;
		for (const chainId of chainIds) {
			pricesUpdated += await this.refreshChain(chainId);
		}

		this.logger.info("Asset price refresh complete", {
			chainsProcessed: chainIds.length,
			pricesUpdated,
		});

		return { pricesUpdated, chainsProcessed: chainIds.length };
	}

	private async refreshChain(chainId: number): Promise<number> {
		const assets = await this.assetRepository.listByChain(chainId);
		const erc20s = assets.filter(
			(a): a is typeof a & { address: string } => a.address !== null,
		);
		if (erc20s.length === 0) return 0;

		const prices = await this.priceFetcher.fetchPrices({
			chainId,
			addresses: erc20s.map((a) => a.address),
		});
		if (prices.length === 0) {
			this.logger.warning("LiFi returned no prices for chain", { chainId });
			return 0;
		}

		const byAddress = new Map(erc20s.map((a) => [a.address.toLowerCase(), a]));
		const upserts: UpsertAssetPriceInput[] = [];
		for (const price of prices) {
			const asset = byAddress.get(price.address);
			if (!asset) continue;
			upserts.push({
				assetId: asset.id,
				priceUsd: price.priceUsd,
				source: PRICE_SOURCE,
			});
		}

		if (upserts.length === 0) return 0;
		await this.assetPriceRepository.upsertMany(upserts);
		return upserts.length;
	}
}
