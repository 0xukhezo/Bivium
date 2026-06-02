import { COMMON_TYPES, type IEnvironment } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import environment from "../../env/api-environment.js";
import { logger } from "../../logger/logger.js";

export const configBindings = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		bind<ILogger>(COMMON_TYPES.Logger).toConstantValue(logger);
		bind<IEnvironment>(COMMON_TYPES.Environment).toConstantValue(environment);
	},
);
