import { Asset, type AssetType } from "@bivium/domain";
import type { Asset as PrismaAsset } from "../../generated/client/index.js";

export function mapPrismaAssetToDomain(record: PrismaAsset): Asset {
	return new Asset({
		id: record.id,
		chainId: record.chainId,
		address: record.address,
		symbol: record.symbol,
		decimals: record.decimals,
		name: record.name,
		logoUrl: record.logoUrl,
		type: record.type as AssetType,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	});
}
