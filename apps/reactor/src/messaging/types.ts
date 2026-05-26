import type { ConsumeMessage } from "amqplib";

export interface SubscriptionBinding {
	exchange: string;
	queue: string;
	routingKeys: string[];
	prefetch?: number;
	handler: (payload: unknown, raw: ConsumeMessage) => Promise<void>;
}
