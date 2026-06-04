export const CONTROLLER_TYPES = {
	HealthController: Symbol.for("HealthController"),
	MarketsController: Symbol.for("MarketsController"),
	LenderMarketsController: Symbol.for("LenderMarketsController"),
	BorrowersController: Symbol.for("BorrowersController"),
} as const;
