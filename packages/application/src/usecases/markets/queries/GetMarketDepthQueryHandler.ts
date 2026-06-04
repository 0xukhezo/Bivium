import {
	type Asset,
	type AssetPrice,
	DOMAIN_TYPES,
	type IAssetPriceRepository,
	type IAssetRepository,
	type IMarketDepthRepository,
	type MarketDepthOffer,
	ResourceNotFoundError,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	GetMarketDepthQueryInputDto,
	GetMarketDepthQueryOutputDto,
	MarketDepthStepDto,
	MarketDepthTokenInfoDto,
} from "../dtos/GetMarketDepthQueryDto.js";

const DEFAULT_CHAIN_ID = 42161;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const RATE_FIXED_POINT_SCALE = 1e18;

@injectable()
@injectFromBase()
export class GetMarketDepthQueryHandler extends BaseUseCase<
	GetMarketDepthQueryInputDto,
	GetMarketDepthQueryOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.MarketDepthRepository)
		private readonly marketDepthRepository: IMarketDepthRepository,
		@inject(DOMAIN_TYPES.AssetRepository)
		private readonly assetRepository: IAssetRepository,
		@inject(DOMAIN_TYPES.AssetPriceRepository)
		private readonly assetPriceRepository: IAssetPriceRepository,
	) {
		super();
	}

	async execute(
		input: GetMarketDepthQueryInputDto,
	): Promise<GetMarketDepthQueryOutputDto> {
		const chainId = input.chainId ?? DEFAULT_CHAIN_ID;
		const collateral = input.collateral.toLowerCase();
		const loan = input.loan.toLowerCase();

		const curated = await this.marketDepthRepository.findCuratedPair({
			collateral,
			loan,
			chainId,
		});
		if (!curated) {
			throw new ResourceNotFoundError("Pair", `${collateral}/${loan}`);
		}

		const [assets, offers] = await Promise.all([
			this.assetRepository.findManyByAddresses({
				chainId,
				addresses: [collateral, loan],
			}),
			this.marketDepthRepository.listEligibleOffers({
				collateral,
				loan,
				chainId,
			}),
		]);
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

		const collateralInfo = tokenInfo(
			collateral,
			assetsByAddress,
			pricesByAssetId,
		);
		const loanInfo = tokenInfo(loan, assetsByAddress, pricesByAssetId);

		// `lender_rates` PK is `(lender, loanToken)`, so the JOIN can't produce
		// two rows for the same lender at the same pair. Defensive Map dedupe
		// keeps the first (best-priced, largest size by ORDER BY) just in case
		// the SQL ordering changes upstream.
		const uniqueByLender = new Map<string, MarketDepthOffer>();
		for (const offer of offers) {
			if (!uniqueByLender.has(offer.lender)) {
				uniqueByLender.set(offer.lender, offer);
			}
		}

		let cumulativeSize = 0n;
		let cumulativeSizeUsd: number | null =
			loanInfo.priceUsd === null ? null : 0;
		let weightedNumerator = 0;
		let weightedDenominator = 0;
		const steps: MarketDepthStepDto[] = [];

		for (const offer of uniqueByLender.values()) {
			const apy = ratePerSecondToAnnual(offer.ratePerSecond);
			const sizeUsd = toUsd(offer.size, loanInfo);
			cumulativeSize += offer.size;
			if (cumulativeSizeUsd !== null) {
				if (sizeUsd === null) cumulativeSizeUsd = null;
				else cumulativeSizeUsd += sizeUsd;
			}
			const sizeAsNumber = Number(offer.size);
			weightedNumerator += apy * sizeAsNumber;
			weightedDenominator += sizeAsNumber;
			const cumulativeAvgApy =
				weightedDenominator > 0
					? weightedNumerator / weightedDenominator
					: null;
			steps.push({
				lender: offer.lender,
				ratePerSecond: offer.ratePerSecond,
				apy,
				size: offer.size,
				sizeUsd,
				cumulativeSize,
				cumulativeSizeUsd,
				cumulativeAvgApy,
			});
		}

		const totalAvailable = cumulativeSize;
		const totalAvailableUsd =
			loanInfo.priceUsd === null
				? null
				: steps.length === 0
					? 0
					: cumulativeSizeUsd;

		return {
			chainId,
			collateral: collateralInfo,
			loan: loanInfo,
			lltv: curated.lltv,
			totalAvailable,
			totalAvailableUsd,
			steps,
		};
	}
}

function tokenInfo(
	address: string,
	assets: Map<string, Asset>,
	prices: Map<string, AssetPrice>,
): MarketDepthTokenInfoDto {
	const asset = assets.get(address.toLowerCase());
	if (!asset) {
		// Address curated by the protocol but no Asset row seeded — surface raw
		// address so the FE can at least render the slot. Re-run the seed to fix.
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
	token: MarketDepthTokenInfoDto,
): number | null {
	if (token.priceUsd === null) return null;
	// Token amounts are bounded by chain supply; Number() precision loss only
	// kicks in past 2^53. Acceptable for USD display alongside a price that
	// itself carries 2–4 significant digits.
	const human = Number(rawAmount) / 10 ** token.decimals;
	return human * token.priceUsd;
}

function ratePerSecondToAnnual(ratePerSecond: bigint): number {
	return (Number(ratePerSecond) * SECONDS_PER_YEAR) / RATE_FIXED_POINT_SCALE;
}
