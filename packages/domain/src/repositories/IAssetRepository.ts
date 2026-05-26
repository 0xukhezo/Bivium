import type { Asset } from "../entities/Asset.js";
import type { AssetType } from "../entities/AssetType.js";

export interface FindOrCreateAssetInput {
	chainId: number;
	/** Token contract address; `null` for the chain's native asset. */
	address: string | null;
	symbol: string;
	decimals: number;
	type: AssetType;
	name?: string | null;
	logoUrl?: string | null;
}

export interface IAssetRepository {
	findOrCreate(input: FindOrCreateAssetInput): Promise<Asset>;
}
