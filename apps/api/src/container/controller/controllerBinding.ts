import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { HealthController } from "../../presentation/health/HealthController.js";
import { MarketsController } from "../../presentation/markets/MarketsController.js";
import { CONTROLLER_TYPES } from "./controllerTypes.js";

export const controllerBindings = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		bind<HealthController>(CONTROLLER_TYPES.HealthController)
			.to(HealthController)
			.inSingletonScope();
		bind<MarketsController>(CONTROLLER_TYPES.MarketsController)
			.to(MarketsController)
			.inSingletonScope();
	},
);
