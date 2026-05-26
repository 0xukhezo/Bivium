import type { AssetType } from "@bivium/domain";

export interface AssetBalance {
	chainId: number;
	/** Token contract address; `null` for the chain's native asset (e.g. ETH). */
	address: string | null;
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
