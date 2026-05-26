import { DOMAIN_TYPES } from "@bivium/domain";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { AssetRepository } from "../repositories/AssetRepository.js";
import { OnchainEventRepository } from "../repositories/OnchainEventRepository.js";
import { UserCurrentBalanceRepository } from "../repositories/UserCurrentBalanceRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";

export const repositoryModule = new ContainerModule(
	({ bind }: ContainerModuleLoadOptions) => {
		bind(DOMAIN_TYPES.OnchainEventRepository)
			.to(OnchainEventRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.UserRepository).to(UserRepository).inSingletonScope();
		bind(DOMAIN_TYPES.AssetRepository).to(AssetRepository).inSingletonScope();
		bind(DOMAIN_TYPES.UserCurrentBalanceRepository)
			.to(UserCurrentBalanceRepository)
			.inSingletonScope();
	},
);
