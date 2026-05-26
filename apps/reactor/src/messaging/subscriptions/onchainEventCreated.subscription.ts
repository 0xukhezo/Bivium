import { ONCHAIN_EVENT_CREATED_ROUTING_KEY } from "@bivium/domain";
import { onOnchainEventCreated } from "../../handlers/onchain-events/onOnchainEventCreated.js";
import { logger } from "../../logger/logger.js";
import type { SubscriptionBinding } from "../types.js";

export const onchainEventCreatedSubscription: SubscriptionBinding = {
	exchange: "bivium.events",
	queue: "bivium.reactor.onchain-events",
	routingKeys: [ONCHAIN_EVENT_CREATED_ROUTING_KEY],
	prefetch: 10,
	handler: async (payload) => {
		await onOnchainEventCreated(payload, logger);
	},
};
