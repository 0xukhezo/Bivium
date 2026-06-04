import { COMMON_TYPES, type IEnvironment } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import {
	type AlchemyNotifyConfig,
	INFRASTRUCTURE_TYPES,
	LiFiClient,
} from "@bivium/infrastructure";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import environment from "../../env/jobs-environment.js";
import { logger } from "../../logger/logger.js";

export const configBindings = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		bind<ILogger>(COMMON_TYPES.Logger).toConstantValue(logger);
		bind<IEnvironment>(COMMON_TYPES.Environment).toConstantValue(environment);

		bind<LiFiClient>(INFRASTRUCTURE_TYPES.LiFiClient).toConstantValue(
			new LiFiClient({
				apiUrl: environment.lifiApiUrl,
				apiKey: environment.lifiApiKey,
				timeoutMs: environment.lifiTimeoutMs,
			}),
		);

		// AlchemyNotifyConfig is only consumed by the lender-webhook-sync job. If
		// the operator hasn't filled in the env vars, bind a placeholder — the
		// job module guards on the same env values and unregisters itself, so
		// the placeholder is never actually invoked at runtime.
		const notifyConfig: AlchemyNotifyConfig = {
			authToken: environment.alchemyNotifyAuthToken ?? "",
			webhookId: environment.alchemyWebhookId ?? "",
		};
		bind<AlchemyNotifyConfig>(
			INFRASTRUCTURE_TYPES.AlchemyNotifyConfig,
		).toConstantValue(notifyConfig);
	},
);
