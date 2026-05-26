import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { WebhooksController } from "../../presentation/controllers/WebhooksController.js";
import { SystemController } from "../../presentation/system/SystemController.js";
import { CONTROLLER_TYPES } from "./controllerTypes.js";

export const controllerBindings = new ContainerModule(
	(options: ContainerModuleLoadOptions) => {
		const { bind } = options;
		bind<WebhooksController>(CONTROLLER_TYPES.WebhooksController)
			.to(WebhooksController)
			.inSingletonScope();
		bind<SystemController>(CONTROLLER_TYPES.SystemController)
			.to(SystemController)
			.inSingletonScope();
	},
);
