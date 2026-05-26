import type {
	Asset,
	FindOrCreateAssetInput,
	IAssetRepository,
} from "@bivium/domain";
import { injectable } from "inversify";
import type { AssetType as PrismaAssetType } from "../../generated/client/index.js";
import { mapPrismaAssetToDomain } from "../mappers/AssetMapper.js";
import { BaseRepository } from "./BaseRepository.js";

@injectable()
export class AssetRepository
	extends BaseRepository
	implements IAssetRepository
{
	async findOrCreate(input: FindOrCreateAssetInput): Promise<Asset> {
		const address = input.address?.toLowerCase() ?? null;

		const existing = await this.prisma.asset.findUnique({
			where: {
				chainId_address: {
					chainId: input.chainId,
					address: address as string,
				},
			},
		});
		if (existing) return mapPrismaAssetToDomain(existing);

		const created = await this.prisma.asset.create({
			data: {
				chainId: input.chainId,
				address,
				symbol: input.symbol,
				decimals: input.decimals,
				name: input.name ?? null,
				logoUrl: input.logoUrl ?? null,
				type: input.type as PrismaAssetType,
			},
		});
		return mapPrismaAssetToDomain(created);
	}
}
