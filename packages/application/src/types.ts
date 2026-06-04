export const APPLICATION_TYPES = {
	// Handlers
	SaveOnchainEventsCommandHandler: Symbol.for(
		"SaveOnchainEventsCommandHandler",
	),
	ProcessOnchainEventCommandHandler: Symbol.for(
		"ProcessOnchainEventCommandHandler",
	),
	UpdateBalanceHistoryCommandHandler: Symbol.for(
		"UpdateBalanceHistoryCommandHandler",
	),
	UpdateAssetPricesCommandHandler: Symbol.for(
		"UpdateAssetPricesCommandHandler",
	),
	GetMarketSummariesQueryHandler: Symbol.for("GetMarketSummariesQueryHandler"),
	GetLenderMarketsQueryHandler: Symbol.for("GetLenderMarketsQueryHandler"),
	OutboxPollerService: Symbol.for("OutboxPollerService"),

	// Ports
	EventPublisher: Symbol.for("EventPublisher"),
	RabbitMQPublisher: Symbol.for("RabbitMQPublisher"),
	RabbitMQPublisherConfig: Symbol.for("RabbitMQPublisherConfig"),
	OutboxEventRepository: Symbol.for("OutboxEventRepository"),
	PostCommitFlusher: Symbol.for("PostCommitFlusher"),
	TransactionManager: Symbol.for("TransactionManager"),
	AlchemyBalanceFetcher: Symbol.for("AlchemyBalanceFetcher"),
} as const;
