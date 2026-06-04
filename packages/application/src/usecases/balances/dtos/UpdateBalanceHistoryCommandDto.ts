export type UpdateBalanceHistoryCommandInputDto = {
	chainId: number;
	addresses: string[];
};

export type UpdateBalanceHistoryCommandOutputDto = {
	processedAddresses: number;
	upsertedBalances: number;
};
