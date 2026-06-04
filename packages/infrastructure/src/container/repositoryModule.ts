import { DOMAIN_TYPES } from "@bivium/domain";
import { ContainerModule, type ContainerModuleLoadOptions } from "inversify";
import { AssetPriceRepository } from "../repositories/AssetPriceRepository.js";
import { AssetRepository } from "../repositories/AssetRepository.js";
import { BorrowerLoanRepository } from "../repositories/BorrowerLoanRepository.js";
import { IndexerLenderReadRepository } from "../repositories/IndexerLenderReadRepository.js";
import { LenderMarketSummaryRepository } from "../repositories/LenderMarketSummaryRepository.js";
import { MarketDepthRepository } from "../repositories/MarketDepthRepository.js";
import { MarketSummaryRepository } from "../repositories/MarketSummaryRepository.js";
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
		bind(DOMAIN_TYPES.AssetPriceRepository)
			.to(AssetPriceRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.MarketSummaryRepository)
			.to(MarketSummaryRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.LenderMarketSummaryRepository)
			.to(LenderMarketSummaryRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.BorrowerLoanRepository)
			.to(BorrowerLoanRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.MarketDepthRepository)
			.to(MarketDepthRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.IndexerLenderReadRepository)
			.to(IndexerLenderReadRepository)
			.inSingletonScope();
		bind(DOMAIN_TYPES.UserCurrentBalanceRepository)
			.to(UserCurrentBalanceRepository)
			.inSingletonScope();
	},
);
