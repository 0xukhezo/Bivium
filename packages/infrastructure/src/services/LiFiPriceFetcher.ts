import type { ILiFiPriceFetcher, LiFiPrice } from "@bivium/domain";
import { inject, injectable } from "inversify";
import type { LiFiClient } from "../clients/LiFiClient.js";
import { INFRASTRUCTURE_TYPES } from "../types.js";

@injectable()
export class LiFiPriceFetcher implements ILiFiPriceFetcher {
	constructor(
		@inject(INFRASTRUCTURE_TYPES.LiFiClient)
		private readonly client: LiFiClient,
	) {}

	async fetchPrices(input: {
		chainId: number;
		addresses: string[];
	}): Promise<LiFiPrice[]> {
		if (input.addresses.length === 0) return [];

		const tokensByChain = await this.client.getTokens({
			chainIds: [input.chainId],
		});
		const tokens = tokensByChain[String(input.chainId)] ?? [];
		if (tokens.length === 0) return [];

		const wanted = new Set(input.addresses.map((a) => a.toLowerCase()));
		const out: LiFiPrice[] = [];
		for (const token of tokens) {
			const address = token.address.toLowerCase();
			if (!wanted.has(address)) continue;
			const price = Number(token.priceUSD);
			if (!Number.isFinite(price) || price <= 0) continue;
			out.push({ chainId: input.chainId, address, priceUsd: price });
		}
		return out;
	}
}
