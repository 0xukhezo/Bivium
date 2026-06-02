export type UpdateAssetPricesCommandInputDto = {
	/** Restrict the refresh to a subset of chains. Empty/undefined = all chains. */
	chainIds?: number[];
};

export type UpdateAssetPricesCommandOutputDto = {
	pricesUpdated: number;
	chainsProcessed: number;
};
