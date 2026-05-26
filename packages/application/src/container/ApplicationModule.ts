import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { APPLICATION_TYPES } from "../types.js";
import { UpdateBalanceHistoryCommandHandler } from "../usecases/balances/commands/UpdateBalanceHistoryCommandHandler.js";
import { OutboxPollerService } from "../usecases/outbox/services/OutboxPollerService.js";
import { ProcessOnchainEventCommandHandler } from "../usecases/webhooks/commands/process/ProcessOnchainEventCommandHandler.js";
import { SaveOnchainEventsCommandHandler } from "../usecases/webhooks/commands/SaveOnchainEventsCommandHandler.js";

export const applicationModule = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		bind(APPLICATION_TYPES.SaveOnchainEventsCommandHandler)
			.to(SaveOnchainEventsCommandHandler)
			.inSingletonScope();

		bind(APPLICATION_TYPES.ProcessOnchainEventCommandHandler)
			.to(ProcessOnchainEventCommandHandler)
			.inSingletonScope();

		bind(APPLICATION_TYPES.UpdateBalanceHistoryCommandHandler)
			.to(UpdateBalanceHistoryCommandHandler)
			.inSingletonScope();

		bind(APPLICATION_TYPES.OutboxPollerService)
			.to(OutboxPollerService)
			.inSingletonScope();
	},
);
