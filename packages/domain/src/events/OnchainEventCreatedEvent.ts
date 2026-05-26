export const ONCHAIN_EVENT_CREATED_ROUTING_KEY = "onchain.event.created" as const;

/**
 * Emitted by the watcher after persisting a raw OnchainEvent. The reactor
 * consumes it and runs provider-specific interpretation (wallet extraction,
 * follow-up events) in a separate use case — keeps the webhook handler thin.
 */
export interface OnchainEventCreatedEvent {
	onchainEventId: string;
}
