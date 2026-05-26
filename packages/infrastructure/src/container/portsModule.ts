import { APPLICATION_TYPES } from "@bivium/application";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { OutboxAwareEventPublisher } from "../events/OutboxAwareEventPublisher.js";
import { RabbitMqEventPublisher } from "../messaging/RabbitMqEventPublisher.js";
import { OutboxEventRepository } from "../repositories/OutboxEventRepository.js";
import { AlchemyBalanceFetcher } from "../services/AlchemyBalanceFetcher.js";
import { PrismaTransactionManager } from "../services/PrismaTransactionManager.js";

export const portsModule = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		// OutboxAwareEventPublisher implements BOTH IEventPublisherPort (used inside
		// txs by command handlers) and IPostCommitFlusherPort (invoked by the tx
		// manager after commit). Bind the singleton to one symbol and alias the
		// other to the same instance via toService so both ports share state.
		bind(APPLICATION_TYPES.EventPublisher)
			.to(OutboxAwareEventPublisher)
			.inSingletonScope();
		bind(APPLICATION_TYPES.PostCommitFlusher).toService(
			APPLICATION_TYPES.EventPublisher,
		);

		bind(APPLICATION_TYPES.RabbitMQPublisher)
			.to(RabbitMqEventPublisher)
			.inSingletonScope();
		bind(APPLICATION_TYPES.OutboxEventRepository)
			.to(OutboxEventRepository)
			.inSingletonScope();
		bind(APPLICATION_TYPES.TransactionManager)
			.to(PrismaTransactionManager)
			.inSingletonScope();
		bind(APPLICATION_TYPES.AlchemyBalanceFetcher)
			.to(AlchemyBalanceFetcher)
			.inSingletonScope();
	},
);
