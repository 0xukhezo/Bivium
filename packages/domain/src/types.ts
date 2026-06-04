export const DOMAIN_REPOSITORY_TYPES = {
	OnchainEventRepository: Symbol.for("OnchainEventRepository"),
	UserRepository: Symbol.for("UserRepository"),
	AssetRepository: Symbol.for("AssetRepository"),
	AssetPriceRepository: Symbol.for("AssetPriceRepository"),
	UserCurrentBalanceRepository: Symbol.for("UserCurrentBalanceRepository"),
	MarketSummaryRepository: Symbol.for("MarketSummaryRepository"),
	LenderMarketSummaryRepository: Symbol.for("LenderMarketSummaryRepository"),
	BorrowerLoanRepository: Symbol.for("BorrowerLoanRepository"),
	MarketDepthRepository: Symbol.for("MarketDepthRepository"),
} as const;

export const DOMAIN_SERVICE_TYPES = {
	LiFiPriceFetcher: Symbol.for("LiFiPriceFetcher"),
} as const;

export const DOMAIN_CONFIG_TYPES = {
	LiFiClientConfig: Symbol.for("LiFiClientConfig"),
} as const;

export const DOMAIN_TYPES = {
	...DOMAIN_REPOSITORY_TYPES,
	...DOMAIN_SERVICE_TYPES,
	...DOMAIN_CONFIG_TYPES,
} as const;
