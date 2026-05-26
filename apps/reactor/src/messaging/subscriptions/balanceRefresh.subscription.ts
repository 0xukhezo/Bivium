import { USER_BALANCE_REFRESH_ROUTING_KEY } from "@bivium/domain";
import { onUserBalanceRefresh } from "../../handlers/balance/onUserBalanceRefresh.js";
import { logger } from "../../logger/logger.js";
import type { SubscriptionBinding } from "../types.js";

export const balanceRefreshSubscription: SubscriptionBinding = {
	exchange: "bivium.events",
	queue: "bivium.reactor.balance-refresh",
	routingKeys: [USER_BALANCE_REFRESH_ROUTING_KEY],
	prefetch: 10,
	handler: async (payload) => {
		await onUserBalanceRefresh(payload, logger);
	},
};
