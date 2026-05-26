export const DOMAIN_REPOSITORY_TYPES = {
	OnchainEventRepository: Symbol.for("OnchainEventRepository"),
	UserRepository: Symbol.for("UserRepository"),
	AssetRepository: Symbol.for("AssetRepository"),
	UserCurrentBalanceRepository: Symbol.for("UserCurrentBalanceRepository"),
} as const;

export const DOMAIN_SERVICE_TYPES = {} as const;

export const DOMAIN_CONFIG_TYPES = {} as const;

export const DOMAIN_TYPES = {
	...DOMAIN_REPOSITORY_TYPES,
	...DOMAIN_SERVICE_TYPES,
	...DOMAIN_CONFIG_TYPES,
} as const;
