/**
 * Raw RabbitMQ publish — used by the `OutboxPollerService` (background) and
 * `OutboxAwareEventPublisher.flush()` (post-commit fast path). Domain use cases
 * MUST go through `IEventPublisherPort` (outbox-aware) instead.
 */
export interface IRabbitMQPublisherPort {
	publish(
		exchange: string,
		routingKey: string,
		payload: unknown,
	): Promise<void>;

	/** Graceful shutdown — closes channel + connection. Safe to call repeatedly. */
	close(): Promise<void>;
}

/**
 * Config injected into the concrete `RabbitMqEventPublisher` implementation
 * via `APPLICATION_TYPES.RabbitMQPublisherConfig`. Each app binds its own
 * (url + appId differ between watcher and reactor).
 */
export interface RabbitMQPublisherConfig {
	url: string;
	exchangeName?: string;
	exchangeType?: "topic" | "direct" | "fanout" | "headers";
	confirmTimeoutMs?: number;
	reconnectInitialDelayMs?: number;
	reconnectMaxDelayMs?: number;
	/** Sets `appId` in AMQP message properties — useful for tracing the producer. */
	appId?: string;
}
