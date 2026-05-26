export const USER_BALANCE_REFRESH_ROUTING_KEY = "user.balance.refresh" as const;

export interface UserBalanceRefreshEvent {
	address: string;
	chainId: number;
	attempt?: number;
}
