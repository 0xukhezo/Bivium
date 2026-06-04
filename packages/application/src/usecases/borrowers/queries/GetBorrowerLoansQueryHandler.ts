import {
	type Asset,
	type AssetPrice,
	type BorrowerLoanPosition,
	DOMAIN_TYPES,
	type IAssetPriceRepository,
	type IAssetRepository,
	type IBorrowerLoanRepository,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	BorrowerLoanPositionDto,
	BorrowerLoanRowDto,
	BorrowerLoanTokenInfoDto,
	GetBorrowerLoansQueryInputDto,
	GetBorrowerLoansQueryOutputDto,
} from "../dtos/GetBorrowerLoansQueryDto.js";

const DEFAULT_CHAIN_ID = 42161;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const RATE_FIXED_POINT_SCALE = 1e18;
const LLTV_FIXED_POINT_SCALE = 1e18;

@injectable()
@injectFromBase()
export class GetBorrowerLoansQueryHandler extends BaseUseCase<
	GetBorrowerLoansQueryInputDto,
	GetBorrowerLoansQueryOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.BorrowerLoanRepository)
		private readonly borrowerLoanRepository: IBorrowerLoanRepository,
		@inject(DOMAIN_TYPES.AssetRepository)
		private readonly assetRepository: IAssetRepository,
		@inject(DOMAIN_TYPES.AssetPriceRepository)
		private readonly assetPriceRepository: IAssetPriceRepository,
	) {
		super();
	}

	async execute(
		input: GetBorrowerLoansQueryInputDto,
	): Promise<GetBorrowerLoansQueryOutputDto> {
		const chainId = input.chainId ?? DEFAULT_CHAIN_ID;
		const borrower = input.borrower.toLowerCase();

		const positions = await this.borrowerLoanRepository.listOpenByBorrower({
			borrower,
			chainId,
		});
		if (positions.length === 0) {
			return { chainId, borrower, rows: [] };
		}

		const addresses = uniqueTokenAddresses(positions);
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

		const positionDtos = positions.map((p) => {
			const collateralInfo = tokenInfo(
				p.collateralToken,
				assetsByAddress,
				pricesByAssetId,
			);
			const loanInfo = tokenInfo(p.loanToken, assetsByAddress, pricesByAssetId);
			const debtAmount = sharesToAssets(
				p.borrowShares,
				p.totalBorrowAssets,
				p.totalBorrowShares,
			);
			const debtUsd = toUsd(debtAmount, loanInfo);
			const collateralUsd = toUsd(p.collateralAmount, collateralInfo);
			const apy = ratePerSecondToAnnual(p.ratePerSecond);
			const healthFactor = computeHealthFactor(collateralUsd, debtUsd, p.lltv);
			return {
				position: {
					marketId: p.marketId,
					lender: p.lender,
					oracle: p.oracle,
					ratePerSecond: p.ratePerSecond,
					apy,
					borrowShares: p.borrowShares,
					debtAmount,
					collateralAmount: p.collateralAmount,
					debtUsd,
					collateralUsd,
					healthFactor,
				} satisfies BorrowerLoanPositionDto,
				collateralInfo,
				loanInfo,
				lltv: p.lltv,
			};
		});

		const rows = groupByPair(positionDtos);
		return { chainId, borrower, rows };
	}
}

interface EnrichedPosition {
	position: BorrowerLoanPositionDto;
	collateralInfo: BorrowerLoanTokenInfoDto;
	loanInfo: BorrowerLoanTokenInfoDto;
	lltv: bigint;
}

function groupByPair(items: EnrichedPosition[]): BorrowerLoanRowDto[] {
	const byKey = new Map<string, EnrichedPosition[]>();
	for (const it of items) {
		const key = pairKey(it.collateralInfo.address, it.loanInfo.address);
		const bucket = byKey.get(key);
		if (bucket) {
			bucket.push(it);
		} else {
			byKey.set(key, [it]);
		}
	}

	const rows: BorrowerLoanRowDto[] = [];
	for (const [key, bucket] of byKey) {
		const head = bucket[0];
		if (!head) continue; // unreachable — map values are non-empty by construction

		let totalCollateralAmount = 0n;
		let totalDebtAmount = 0n;
		let totalCollateralUsd: number | null = 0;
		let totalDebtUsd: number | null = 0;
		let weightedNumerator = 0;
		let weightedDenominator = 0;
		let lowestHf: number | null = null;

		for (const it of bucket) {
			const { position } = it;
			totalCollateralAmount += position.collateralAmount;
			totalDebtAmount += position.debtAmount;

			if (totalCollateralUsd !== null) {
				if (position.collateralUsd === null) totalCollateralUsd = null;
				else totalCollateralUsd += position.collateralUsd;
			}
			if (totalDebtUsd !== null) {
				if (position.debtUsd === null) totalDebtUsd = null;
				else totalDebtUsd += position.debtUsd;
			}

			const debtAsNumber = Number(position.debtAmount);
			weightedNumerator += position.apy * debtAsNumber;
			weightedDenominator += debtAsNumber;

			if (position.healthFactor !== null) {
				lowestHf =
					lowestHf === null
						? position.healthFactor
						: Math.min(lowestHf, position.healthFactor);
			}
		}

		const weightedApy =
			weightedDenominator > 0 ? weightedNumerator / weightedDenominator : null;

		rows.push({
			pairKey: key,
			collateral: head.collateralInfo,
			loan: head.loanInfo,
			lltv: head.lltv,
			totalCollateralAmount,
			totalDebtAmount,
			totalCollateralUsd,
			totalDebtUsd,
			weightedApy,
			lowestHealthFactor: lowestHf,
			positions: bucket.map((it) => it.position),
		});
	}

	return rows;
}

function pairKey(collateral: string, loan: string): string {
	return `${collateral.toLowerCase()}-${loan.toLowerCase()}`;
}

function uniqueTokenAddresses(positions: BorrowerLoanPosition[]): string[] {
	const set = new Set<string>();
	for (const p of positions) {
		set.add(p.collateralToken);
		set.add(p.loanToken);
	}
	return [...set];
}

function tokenInfo(
	address: string,
	assets: Map<string, Asset>,
	prices: Map<string, AssetPrice>,
): BorrowerLoanTokenInfoDto {
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
	token: BorrowerLoanTokenInfoDto,
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

/**
 * Mirrors Morpho's `borrowShares → assets` conversion. The on-chain math is
 * a virtual-shares mulDivDown but the indexer-tracked totals already account
 * for the virtual offsets via Borrow/Repay/AccrueInterest handlers, so a flat
 * `shares * totalAssets / totalShares` matches the protocol's
 * `expectedBorrowAssets` view.
 *
 * Defensive `totalShares == 0` short-circuit: shouldn't happen while
 * `borrowShares > 0`, but avoids a runtime div-by-zero if indexer state is
 * mid-write.
 */
function sharesToAssets(
	shares: bigint,
	totalAssets: bigint,
	totalShares: bigint,
): bigint {
	if (totalShares === 0n) return 0n;
	return (shares * totalAssets) / totalShares;
}

function computeHealthFactor(
	collateralUsd: number | null,
	debtUsd: number | null,
	lltv: bigint,
): number | null {
	if (collateralUsd === null || debtUsd === null) return null;
	if (debtUsd === 0) return null;
	const lltvFraction = Number(lltv) / LLTV_FIXED_POINT_SCALE;
	return (collateralUsd * lltvFraction) / debtUsd;
}
