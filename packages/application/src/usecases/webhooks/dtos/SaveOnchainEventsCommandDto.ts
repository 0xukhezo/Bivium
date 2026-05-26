import type { OnchainEventProps } from "@bivium/domain";

export type SaveOnchainEventsCommandInputDto = {
	/**
	 * Pre-built domain payloads (sans id). The controller builds these via
	 * `OnchainEvent.createFromAlchemyWebhook(rawPayload)`.
	 */
	events: Array<Omit<OnchainEventProps, "id">>;
};

export type SaveOnchainEventsCommandOutputDto = {
	savedCount: number;
	savedIds: string[];
};
