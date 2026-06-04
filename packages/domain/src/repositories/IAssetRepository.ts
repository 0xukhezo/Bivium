import type { Asset } from "../entities/Asset.js";
import type { AssetType } from "../entities/AssetType.js";

export interface FindOrCreateAssetInput {
	chainId: number;
	/** Token address. Use `NATIVE_ASSET_ADDRESS` (`0x0…0`) for the chain's native asset. */
	address: string;
	symbol: string;
	decimals: number;
	type: AssetType;
	name?: string | null;
	logoUrl?: string | null;
}

export interface UpsertAssetInput extends FindOrCreateAssetInput {}

export interface IAssetRepository {
	findOrCreate(input: FindOrCreateAssetInput): Promise<Asset>;
	upsert(input: UpsertAssetInput): Promise<Asset>;
	listByChain(chainId: number): Promise<Asset[]>;
	findManyByAddresses(input: {
		chainId: number;
		addresses: string[];
	}): Promise<Asset[]>;
}
