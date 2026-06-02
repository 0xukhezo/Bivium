import { DOMAIN_TYPES } from "@bivium/domain";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { LiFiPriceFetcher } from "../services/LiFiPriceFetcher.js";

export const serviceModule = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		bind(DOMAIN_TYPES.LiFiPriceFetcher)
			.to(LiFiPriceFetcher)
			.inSingletonScope();
	},
);
