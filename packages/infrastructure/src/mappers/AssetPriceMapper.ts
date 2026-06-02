import { AssetPrice } from "@bivium/domain";
import type { AssetPrice as PrismaAssetPrice } from "../../generated/client/index.js";

export function mapPrismaAssetPriceToDomain(
	record: PrismaAssetPrice,
): AssetPrice {
	return new AssetPrice({
		assetId: record.assetId,
		priceUsd: Number(record.priceUsd),
		source: record.source,
		updatedAt: record.updatedAt,
		createdAt: record.createdAt,
	});
}
