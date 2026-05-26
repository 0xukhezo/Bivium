import {
	DOMAIN_TYPES,
	type IOnchainEventRepository,
	ONCHAIN_EVENT_CREATED_ROUTING_KEY,
	type OnchainEventCreatedEvent,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import type { IEventPublisherPort } from "../../../ports/IEventPublisherPort.js";
import type { ITransactionManagerPort } from "../../../ports/ITransactionManagerPort.js";
import { APPLICATION_TYPES } from "../../../types.js";
import { BaseUseCase } from "../../base/BaseUseCase.js";
import type {
	SaveOnchainEventsCommandInputDto,
	SaveOnchainEventsCommandOutputDto,
} from "../dtos/SaveOnchainEventsCommandDto.js";

/**
 * Persists raw OnchainEvents and emits `onchain.event.created` per row.
 *
 * Intentionally does NOT interpret the payload (no wallet extraction, no
 * follow-up events). That's `ProcessOnchainEventCommandHandler`'s job — driven
 * by the reactor consuming `onchain.event.created`. Keeps the webhook handler
 * synchronous-fast and isolates provider-specific logic from persistence.
 */
@injectable()
@injectFromBase()
export class SaveOnchainEventsCommandHandler extends BaseUseCase<
	SaveOnchainEventsCommandInputDto,
	SaveOnchainEventsCommandOutputDto
> {
	constructor(
		@inject(DOMAIN_TYPES.OnchainEventRepository)
		private readonly onchainEventRepository: IOnchainEventRepository,
		@inject(APPLICATION_TYPES.EventPublisher)
		private readonly eventPublisher: IEventPublisherPort,
		@inject(APPLICATION_TYPES.TransactionManager)
		private readonly txManager: ITransactionManagerPort,
	) {
		super();
	}

	async execute(
		input: SaveOnchainEventsCommandInputDto,
	): Promise<SaveOnchainEventsCommandOutputDto> {
		return this.txManager.runInTransaction(async (tx) => {
			const savedIds: string[] = [];

			for (const event of input.events) {
				const saved = await this.onchainEventRepository.createInTransaction(
					tx,
					event,
				);
				savedIds.push(saved.id);

				const payload: OnchainEventCreatedEvent = { onchainEventId: saved.id };
				await this.eventPublisher.publish(
					ONCHAIN_EVENT_CREATED_ROUTING_KEY,
					payload,
					tx,
				);
			}

			this.logger.info("Persisted onchain events", {
				savedCount: savedIds.length,
			});

			return { savedCount: savedIds.length, savedIds };
		});
	}
}
