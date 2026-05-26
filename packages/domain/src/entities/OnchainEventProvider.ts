export const OnchainEventProvider = {
	ALCHEMY: "ALCHEMY",
} as const;

export type OnchainEventProvider =
	(typeof OnchainEventProvider)[keyof typeof OnchainEventProvider];
