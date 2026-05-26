import type { TransactionClient } from "./ITransactionManagerPort.js";

/**
 * Outbox-aware event publisher. Implementations persist an `OutboxEvent` row
 * inside the caller's transaction (atomic with the domain write). A separate
 * `OutboxPollerService` ships rows to the bus.
 *
 * The infrastructure impl SHOULD require a `tx` — pass-through code that
 * publishes without a transaction is a smell and can lose events.
 */
export interface IEventPublisherPort {
	publish(
		routingKey: string,
		payload: unknown,
		tx: TransactionClient,
	): Promise<void>;
}
