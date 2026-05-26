export type ProcessOnchainEventCommandInputDto = {
	onchainEventId: string;
};

export type ProcessOnchainEventCommandOutputDto = {
	skipped: boolean;
	walletsQueued: number;
};
