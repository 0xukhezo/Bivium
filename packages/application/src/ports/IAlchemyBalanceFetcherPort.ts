import type { AssetType } from "@bivium/domain";

export interface AssetBalance {
	chainId: number;
	/** Token address; the native asset uses `0x0…0` (NATIVE_ASSET_ADDRESS). */
	address: string;
	symbol: string;
	decimals: number;
	type: AssetType;
	/** Raw balance in base units (decimal string, preserves precision). */
	balance: string;
	name?: string | null;
	logoUrl?: string | null;
}

export interface FetchBalancesInput {
	chainId: number;
	address: string;
}

export interface IAlchemyBalanceFetcherPort {
	fetchBalances(input: FetchBalancesInput): Promise<AssetBalance[]>;
}
