export interface AssetPriceProps {
	assetId: string;
	priceUsd: number;
	source: string;
	updatedAt: Date;
	createdAt: Date;
}

/**
 * Latest USD price for an Asset. Refreshed periodically by the jobs app.
 *
 * `priceUsd` is a finite Number — the API surface uses standard JS arithmetic
 * for USD display. Bigint precision lives on raw token balances; prices are
 * always small enough to fit in a Number without precision loss.
 */
export class AssetPrice implements AssetPriceProps {
	public readonly assetId: string;
	public readonly priceUsd: number;
	public readonly source: string;
	public readonly updatedAt: Date;
	public readonly createdAt: Date;

	constructor(props: AssetPriceProps) {
		this.assetId = props.assetId;
		this.priceUsd = props.priceUsd;
		this.source = props.source;
		this.updatedAt = props.updatedAt;
		this.createdAt = props.createdAt;
	}
}
