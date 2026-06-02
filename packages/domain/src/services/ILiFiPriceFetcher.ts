/**
 * Port to fetch ERC-20 prices from the LiFi /tokens endpoint. Implementation
 * lives in infrastructure.
 *
 * Bivium only consumes the price + minimal metadata; the swap-flow surface of
 * LiFi (quotes, routes) is not used here.
 */
export interface LiFiPrice {
	chainId: number;
	/** Lowercased contract address. */
	address: string;
	priceUsd: number;
}

export interface ILiFiPriceFetcher {
	/**
	 * Returns the latest USD price for each `(chainId, address)` pair LiFi
	 * has indexed. Addresses not covered by LiFi are silently omitted.
	 */
	fetchPrices(input: { chainId: number; addresses: string[] }): Promise<
		LiFiPrice[]
	>;
}
