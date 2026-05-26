import { balanceRefreshSubscription } from "./subscriptions/balanceRefresh.subscription.js";
import { onchainEventCreatedSubscription } from "./subscriptions/onchainEventCreated.subscription.js";
import type { SubscriptionBinding } from "./types.js";

export const subscriptions: SubscriptionBinding[] = [
	onchainEventCreatedSubscription,
	balanceRefreshSubscription,
];
