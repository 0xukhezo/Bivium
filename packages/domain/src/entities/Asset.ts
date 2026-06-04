import type { AssetType } from "./AssetType.js";

/** Canonical placeholder for a chain's native asset (e.g. ETH on Arbitrum One). */
export const NATIVE_ASSET_ADDRESS =
	"0x0000000000000000000000000000000000000000";

export interface AssetProps {
	id: string;
	chainId: number;
	/**
	 * Token address. ERC-20s use the contract address; the native asset uses
	 * `NATIVE_ASSET_ADDRESS` (`0x0…0`). Always lowercased.
	 */
	address: string;
	symbol: string;
	decimals: number;
	name: string | null;
	logoUrl: string | null;
	type: AssetType;
	createdAt: Date;
	updatedAt: Date;
}

export class Asset implements AssetProps {
	public id: string;
	public chainId: number;
	public address: string;
	public symbol: string;
	public decimals: number;
	public name: string | null;
	public logoUrl: string | null;
	public type: AssetType;
	public createdAt: Date;
	public updatedAt: Date;

	constructor(props: AssetProps) {
		this.id = props.id;
		this.chainId = props.chainId;
		this.address = props.address.toLowerCase();
		this.symbol = props.symbol;
		this.decimals = props.decimals;
		this.name = props.name;
		this.logoUrl = props.logoUrl;
		this.type = props.type;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}
}
