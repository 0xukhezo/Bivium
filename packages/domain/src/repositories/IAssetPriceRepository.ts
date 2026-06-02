import type { AssetPrice } from "../entities/AssetPrice.js";

export interface UpsertAssetPriceInput {
	assetId: string;
	priceUsd: number;
	source: string;
}

export interface IAssetPriceRepository {
	upsertMany(inputs: UpsertAssetPriceInput[]): Promise<void>;
	findByAssetIds(assetIds: string[]): Promise<AssetPrice[]>;
}
