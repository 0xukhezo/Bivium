import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { APPLICATION_TYPES } from "../types.js";
import { UpdateAssetPricesCommandHandler } from "../usecases/assets/commands/UpdateAssetPricesCommandHandler.js";
import { UpdateBalanceHistoryCommandHandler } from "../usecases/balances/commands/UpdateBalanceHistoryCommandHandler.js";
import { GetLenderMarketsQueryHandler } from "../usecases/markets/queries/GetLenderMarketsQueryHandler.js";
import { GetMarketSummariesQueryHandler } from "../usecases/markets/queries/GetMarketSummariesQueryHandler.js";
import { OutboxPollerService } from "../usecases/outbox/services/OutboxPollerService.js";
import { SaveOnchainEventsCommandHandler } from "../usecases/webhooks/commands/SaveOnchainEventsCommandHandler.js";
import { ProcessOnchainEventCommandHandler } from "../usecases/webhooks/commands/process/ProcessOnchainEventCommandHandler.js";

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

		bind(APPLICATION_TYPES.UpdateAssetPricesCommandHandler)
			.to(UpdateAssetPricesCommandHandler)
			.inSingletonScope();

		bind(APPLICATION_TYPES.GetMarketSummariesQueryHandler)
			.to(GetMarketSummariesQueryHandler)
			.inSingletonScope();

		bind(APPLICATION_TYPES.GetLenderMarketsQueryHandler)
			.to(GetLenderMarketsQueryHandler)
			.inSingletonScope();

		bind(APPLICATION_TYPES.OutboxPollerService)
			.to(OutboxPollerService)
			.inSingletonScope();
	},
);
