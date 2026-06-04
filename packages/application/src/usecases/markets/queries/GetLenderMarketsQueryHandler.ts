import {
	type Asset,
	type AssetPrice,
	DOMAIN_TYPES,
	type IAssetPriceRepository,
	type IAssetRepository,
	type ILenderMarketSummaryRepository,
	type LenderMarketSummary,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	GetLenderMarketsQueryInputDto,
	GetLenderMarketsQueryOutputDto,
	LenderMarketRowDto,
	LenderMarketTokenInfoDto,
} from "../dtos/GetLenderMarketsQueryDto.js";

const DEFAULT_CHAIN_ID = 42161;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const RATE_FIXED_POINT_SCALE = 1e18;

@injectable()
@injectFromBase()
export class GetLenderMarketsQueryHandler extends BaseUseCase<
	GetLenderMarketsQueryInputDto,
	GetLenderMarketsQueryOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.LenderMarketSummaryRepository)
		private readonly lenderMarketRepository: ILenderMarketSummaryRepository,
		@inject(DOMAIN_TYPES.AssetRepository)
		private readonly assetRepository: IAssetRepository,
		@inject(DOMAIN_TYPES.AssetPriceRepository)
		private readonly assetPriceRepository: IAssetPriceRepository,
	) {
		super();
	}

	async execute(
		input: GetLenderMarketsQueryInputDto,
	): Promise<GetLenderMarketsQueryOutputDto> {
		const chainId = input.chainId ?? DEFAULT_CHAIN_ID;
		const lender = input.lender.toLowerCase();

		const summaries = await this.lenderMarketRepository.listByLender({
			lender,
			chainId,
		});
		if (summaries.length === 0) {
			return { chainId, lender, rows: [] };
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

		const rows: LenderMarketRowDto[] = summaries.map((summary) => {
			const collateralInfo = tokenInfo(
				summary.collateral,
				assetsByAddress,
				pricesByAssetId,
			);
			const loanInfo = tokenInfo(
				summary.loan,
				assetsByAddress,
				pricesByAssetId,
			);
			return {
				marketId: summary.marketId,
				collateral: collateralInfo,
				loan: loanInfo,
				lltv: summary.lltv,
				collateralAmount: summary.collateralAmount,
				onLoanAmount: summary.onLoanAmount,
				collateralUsd: toUsd(summary.collateralAmount, collateralInfo),
				onLoanUsd: toUsd(summary.onLoanAmount, loanInfo),
				apy: ratePerSecondToAnnual(summary.ratePerSecond),
				status: summary.paused ? "paused" : "active",
			};
		});

		return { chainId, lender, rows };
	}
}

function uniqueAddresses(summaries: LenderMarketSummary[]): string[] {
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
): LenderMarketTokenInfoDto {
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

function toUsd(
	rawAmount: bigint,
	token: LenderMarketTokenInfoDto,
): number | null {
	if (token.priceUsd === null) return null;
	// Token amounts are bounded by chain supply; Number(rawAmount) loses
	// precision only beyond 2^53. Acceptable for USD display where the price
	// itself carries 2–4 significant digits.
	const human = Number(rawAmount) / 10 ** token.decimals;
	return human * token.priceUsd;
}

function ratePerSecondToAnnual(ratePerSecond: bigint): number {
	return (Number(ratePerSecond) * SECONDS_PER_YEAR) / RATE_FIXED_POINT_SCALE;
}
