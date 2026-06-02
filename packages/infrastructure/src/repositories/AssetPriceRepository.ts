import type {
	AssetPrice,
	IAssetPriceRepository,
	UpsertAssetPriceInput,
} from "@bivium/domain";
import { injectable } from "inversify";
import { mapPrismaAssetPriceToDomain } from "../mappers/AssetPriceMapper.js";
import { BaseRepository } from "./BaseRepository.js";

@injectable()
export class AssetPriceRepository
	extends BaseRepository
	implements IAssetPriceRepository
{
	async upsertMany(inputs: UpsertAssetPriceInput[]): Promise<void> {
		if (inputs.length === 0) return;
		await this.prisma.$transaction(
			inputs.map((input) =>
				this.prisma.assetPrice.upsert({
					where: { assetId: input.assetId },
					create: {
						assetId: input.assetId,
						priceUsd: input.priceUsd.toString(),
						source: input.source,
					},
					update: {
						priceUsd: input.priceUsd.toString(),
						source: input.source,
					},
				}),
			),
		);
	}

	async findByAssetIds(assetIds: string[]): Promise<AssetPrice[]> {
		if (assetIds.length === 0) return [];
		const records = await this.prisma.assetPrice.findMany({
			where: { assetId: { in: assetIds } },
		});
		return records.map(mapPrismaAssetPriceToDomain);
	}
}
