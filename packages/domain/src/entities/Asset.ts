import type { AssetType } from "./AssetType.js";

export interface AssetProps {
	id: string;
	chainId: number;
	/** Token contract address; `null` for the chain's native asset (e.g. ETH). */
	address: string | null;
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
	public address: string | null;
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
		this.address = props.address?.toLowerCase() ?? null;
		this.symbol = props.symbol;
		this.decimals = props.decimals;
		this.name = props.name;
		this.logoUrl = props.logoUrl;
		this.type = props.type;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}
}
