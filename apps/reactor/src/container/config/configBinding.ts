import {
	APPLICATION_TYPES,
	type RabbitMQPublisherConfig,
} from "@bivium/application";
import { COMMON_TYPES, type IEnvironment } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { AlchemyClient, INFRASTRUCTURE_TYPES } from "@bivium/infrastructure";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import environment from "../../env/reactor-environment.js";
import { logger } from "../../logger/logger.js";

export const configBindings = new ContainerModule(
	(options: ContainerModuleLoadOptions) => {
		options.bind<ILogger>(COMMON_TYPES.Logger).toConstantValue(logger);
		options
			.bind<IEnvironment>(COMMON_TYPES.Environment)
			.toConstantValue(environment);

		options
			.bind<AlchemyClient>(INFRASTRUCTURE_TYPES.AlchemyClient)
			.toConstantValue(new AlchemyClient({ apiKey: environment.alchemyApiKey }));

		options
			.bind<RabbitMQPublisherConfig>(APPLICATION_TYPES.RabbitMQPublisherConfig)
			.toConstantValue({
				url: environment.rabbitmqUrl,
				exchangeName: "bivium.events",
				exchangeType: "topic",
				appId: "reactor",
			});
	},
);
