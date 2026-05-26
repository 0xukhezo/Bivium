import { Alchemy, Network } from "alchemy-sdk";

export interface AlchemyClientOptions {
	apiKey: string;
}

/**
 * Thin wrapper around alchemy-sdk pinned to Arbitrum mainnet.
 * Single-chain by design — multi-chain support would need a per-network factory.
 */
export class AlchemyClient {
	private readonly alchemy: Alchemy;

	constructor(options: AlchemyClientOptions) {
		this.alchemy = new Alchemy({
			apiKey: options.apiKey,
			network: Network.ARB_MAINNET,
		});
	}

	get sdk(): Alchemy {
		return this.alchemy;
	}
}
