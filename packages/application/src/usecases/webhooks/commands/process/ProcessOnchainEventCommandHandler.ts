import {
	type AlchemyWebhookPayload,
	DOMAIN_TYPES,
	type IOnchainEventRepository,
	OnchainEvent,
	OnchainEventProvider,
	ResourceNotFoundError,
	USER_BALANCE_REFRESH_ROUTING_KEY,
	type UserBalanceRefreshEvent,
} from "@bivium/domain";
import { inject, injectFromBase, injectable } from "inversify";
import type { IEventPublisherPort } from "../../../../ports/IEventPublisherPort.js";
import type { ITransactionManagerPort } from "../../../../ports/ITransactionManagerPort.js";
import { APPLICATION_TYPES } from "../../../../types.js";
import { BaseUseCase } from "../../../base/BaseUseCase.js";
import type {
	ProcessOnchainEventCommandInputDto,
	ProcessOnchainEventCommandOutputDto,
} from "../../dtos/ProcessOnchainEventCommandDto.js";

const ARBITRUM_CHAIN_ID = 42161;

/**
 * Interprets a persisted OnchainEvent and queues follow-up domain events.
 * Today it extracts wallets from Alchemy payloads and emits `user.balance.refresh`
 * per affected wallet. Adding another provider means another branch here — the
 * persistence path (SaveOnchainEventsCommandHandler) stays untouched.
 *
 * Idempotent via the `processed` flag: a redelivered message is a no-op.
 */
@injectable()
@injectFromBase()
export class ProcessOnchainEventCommandHandler extends BaseUseCase<
	ProcessOnchainEventCommandInputDto,
	ProcessOnchainEventCommandOutputDto
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
		input: ProcessOnchainEventCommandInputDto,
	): Promise<ProcessOnchainEventCommandOutputDto> {
		const event = await this.onchainEventRepository.findById(input.onchainEventId);
		if (!event) {
			throw new ResourceNotFoundError("OnchainEvent", input.onchainEventId);
		}

		if (event.processed) {
			this.logger.warning("OnchainEvent already processed, skipping", {
				id: event.id,
			});
			return { skipped: true, walletsQueued: 0 };
		}

		return this.txManager.runInTransaction(async (tx) => {
			let walletsQueued = 0;

			if (event.provider === OnchainEventProvider.ALCHEMY) {
				const payload = event.payload as AlchemyWebhookPayload;
				const wallets = OnchainEvent.extractAffectedWallets(payload);
				for (const address of wallets) {
					const refresh: UserBalanceRefreshEvent = {
						address,
						chainId: ARBITRUM_CHAIN_ID,
					};
					await this.eventPublisher.publish(
						USER_BALANCE_REFRESH_ROUTING_KEY,
						refresh,
						tx,
					);
					walletsQueued++;
				}
			} else {
				this.logger.warning("Unknown provider, marking processed without action", {
					id: event.id,
					provider: event.provider,
				});
			}

			await this.onchainEventRepository.markProcessedInTransaction(tx, event.id);

			this.logger.info("OnchainEvent processed", {
				id: event.id,
				provider: event.provider,
				walletsQueued,
			});

			return { skipped: false, walletsQueued };
		});
	}
}
