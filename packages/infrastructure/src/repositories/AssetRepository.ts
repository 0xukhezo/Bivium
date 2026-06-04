import type {
	Asset,
	FindOrCreateAssetInput,
	IAssetRepository,
	UpsertAssetInput,
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
		const address = input.address.toLowerCase();

		const existing = await this.prisma.asset.findUnique({
			where: { chainId_address: { chainId: input.chainId, address } },
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

	async upsert(input: UpsertAssetInput): Promise<Asset> {
		const address = input.address.toLowerCase();

		const record = await this.prisma.asset.upsert({
			where: { chainId_address: { chainId: input.chainId, address } },
			create: {
				chainId: input.chainId,
				address,
				symbol: input.symbol,
				decimals: input.decimals,
				name: input.name ?? null,
				logoUrl: input.logoUrl ?? null,
				type: input.type as PrismaAssetType,
			},
			update: {
				symbol: input.symbol,
				decimals: input.decimals,
				name: input.name ?? null,
				logoUrl: input.logoUrl ?? null,
				type: input.type as PrismaAssetType,
			},
		});
		return mapPrismaAssetToDomain(record);
	}

	async listByChain(chainId: number): Promise<Asset[]> {
		const records = await this.prisma.asset.findMany({ where: { chainId } });
		return records.map(mapPrismaAssetToDomain);
	}

	async findManyByAddresses(input: {
		chainId: number;
		addresses: string[];
	}): Promise<Asset[]> {
		if (input.addresses.length === 0) return [];
		const lowered = input.addresses.map((a) => a.toLowerCase());
		const records = await this.prisma.asset.findMany({
			where: { chainId: input.chainId, address: { in: lowered } },
		});
		return records.map(mapPrismaAssetToDomain);
	}
}
