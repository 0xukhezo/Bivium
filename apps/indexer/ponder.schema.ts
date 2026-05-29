import { index, onchainTable, primaryKey } from "ponder";

// ──────────────────────────────────────────────────────────────────────────────
// A. Lender identity + configuration
// ──────────────────────────────────────────────────────────────────────────────

/**
 * One row per EOA that has been delegated to the canonical BiviumProfile
 * template via EIP-7702. Created on the first LenderRegistered event for that
 * address; updated on every Pause/Unpause.
 */
export const lenders = onchainTable(
	"lenders",
	(t) => ({
		address: t.hex().primaryKey(),
		paused: t.boolean().notNull().default(false),
		firstSeenBlock: t.bigint().notNull(),
		firstSeenTimestamp: t.bigint().notNull(),
		lastUpdatedBlock: t.bigint().notNull(),
	}),
	(table) => ({
		pausedIdx: index().on(table.paused),
	}),
);

/**
 * Current rate declared by a lender for a given loan token. `ratePerSecond == 0`
 * means the lender has deactivated this loan token (legacy markets at non-zero
 * rates keep running until repaid, but no new fills can match against it).
 *
 * Acts as the "open offer" surface that the orderbook frontend queries.
 */
export const lenderRates = onchainTable(
	"lender_rates",
	(t) => ({
		lender: t.hex().notNull(),
		loanToken: t.hex().notNull(),
		ratePerSecond: t.bigint().notNull(),
		updatedAtBlock: t.bigint().notNull(),
		updatedAtTimestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.lender, table.loanToken] }),
		lenderIdx: index().on(table.lender),
		// Hot path: list eligible makers sorted by rate for a given loan token.
		bookIdx: index().on(table.loanToken, table.ratePerSecond),
	}),
);

/**
 * Membership table for a lender's collateral whitelist. Flat shape so the
 * orderbook query is a single JOIN:
 *   lender_rates(loanToken=X, rate>0)
 *     JOIN lender_collaterals(collateral=Y, allowed=true)
 *     JOIN lenders(paused=false)
 *
 * `AllowedCollateralsSet` is a bulk replace — handler must reset the lender's
 * existing rows to allowed=false before inserting the new set.
 */
export const lenderCollaterals = onchainTable(
	"lender_collaterals",
	(t) => ({
		lender: t.hex().notNull(),
		collateral: t.hex().notNull(),
		allowed: t.boolean().notNull(),
		updatedAtBlock: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.lender, table.collateral] }),
		byLenderIdx: index().on(table.lender, table.allowed),
		byCollateralIdx: index().on(table.collateral, table.allowed),
	}),
);

/**
 * Protocol-curated `(collateralToken, loanToken)` pair registry (the
 * `tokenConfigs` mapping in Bivium). Composite PK lets the same collateral
 * coexist against multiple loan tokens with independent oracles and LLTVs.
 *
 * `active = false` rows are kept for history — removal does not affect existing
 * markets, so the indexer must keep the oracle/lltv reference around.
 *
 * Token decimals live on-chain; the frontend reads them via ERC20.decimals().
 */
export const tokens = onchainTable(
	"tokens",
	(t) => ({
		collateral: t.hex().notNull(),
		loan: t.hex().notNull(),
		oracle: t.hex().notNull(),
		lltv: t.bigint().notNull(),
		active: t.boolean().notNull().default(true),
		updatedAtBlock: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.collateral, table.loan] }),
		// Hot paths: "all loans against this collateral" and "all collaterals
		// accepted for this loan token". Both filter by `active = true` in the
		// frontend, so the index is on the natural lookup column only.
		byCollateralIdx: index().on(table.collateral),
		byLoanIdx: index().on(table.loan),
	}),
);

// ──────────────────────────────────────────────────────────────────────────────
// B. Markets + positions (mutable state)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * One row per Bivium market, keyed by the bytes32 market id.
 *
 * The four `total*` fields are kept in sync by Supply/Withdraw/Borrow/Repay/
 * AccrueInterest/Liquidate handlers. `lastAccrualTimestamp` lets the API layer
 * compute up-to-the-second accrued interest without an extra RPC call.
 */
export const markets = onchainTable(
	"markets",
	(t) => ({
		id: t.hex().primaryKey(),
		loanToken: t.hex().notNull(),
		collateralToken: t.hex().notNull(),
		oracle: t.hex().notNull(),
		ratePerSecond: t.bigint().notNull(),
		lltv: t.bigint().notNull(),
		creator: t.hex().notNull(),
		totalSupplyAssets: t.bigint().notNull().default(0n),
		totalSupplyShares: t.bigint().notNull().default(0n),
		totalBorrowAssets: t.bigint().notNull().default(0n),
		totalBorrowShares: t.bigint().notNull().default(0n),
		lastAccrualTimestamp: t.bigint().notNull(),
		createdAtBlock: t.bigint().notNull(),
		createdAtTimestamp: t.bigint().notNull(),
	}),
	(table) => ({
		creatorIdx: index().on(table.creator),
		pairIdx: index().on(table.loanToken, table.collateralToken),
		// Used by the orderbook to resolve `(loanToken, collateralToken, rate) → market`.
		bookKeyIdx: index().on(
			table.loanToken,
			table.collateralToken,
			table.ratePerSecond,
		),
	}),
);

/**
 * A borrower's position in a specific market. Composite PK (marketId,
 * borrower). Updated on every Borrow / Repay / SupplyCollateral /
 * WithdrawCollateral / Liquidate.
 *
 * Health factor is NOT stored — it requires a live oracle price and would go
 * stale immediately. The API layer computes HF on demand.
 */
export const positions = onchainTable(
	"positions",
	(t) => ({
		marketId: t.hex().notNull(),
		borrower: t.hex().notNull(),
		borrowShares: t.bigint().notNull().default(0n),
		collateral: t.bigint().notNull().default(0n),
		lastUpdatedBlock: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.marketId, table.borrower] }),
		borrowerIdx: index().on(table.borrower),
		// "All open positions in this market" — used by liquidation UIs.
		openIdx: index().on(table.marketId, table.borrowShares),
	}),
);

// ──────────────────────────────────────────────────────────────────────────────
// C. Orderbook activity (the "market orders" surface)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Aggregated row per successful BorrowOrder — emitted once by the Router as
 * `OrderFilled`. The borrower-facing "your borrows" view reads from here.
 */
export const orders = onchainTable(
	"orders",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		borrower: t.hex().notNull(),
		loanToken: t.hex().notNull(),
		collateralToken: t.hex().notNull(),
		loanAmount: t.bigint().notNull(),
		collateralAmount: t.bigint().notNull(),
		weightedAvgRate: t.bigint().notNull(),
		fillsCount: t.integer().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		borrowerIdx: index().on(table.borrower, table.timestamp),
	}),
);

/**
 * One row per `Fill` event — N fills per parent OrderFilled, same tx. The
 * lender-facing "your active loans" view reads from here joined with
 * `positions` on (lender = market.creator, borrower).
 *
 * `orderTxHash` lets us regroup fills under their parent OrderFilled when the
 * UI needs both the per-lender view and the aggregate.
 */
export const fills = onchainTable(
	"fills",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		orderTxHash: t.hex().notNull(),
		borrower: t.hex().notNull(),
		lender: t.hex().notNull(),
		loanToken: t.hex().notNull(),
		amount: t.bigint().notNull(),
		rate: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		lenderIdx: index().on(table.lender, table.timestamp),
		borrowerIdx: index().on(table.borrower, table.timestamp),
		orderIdx: index().on(table.orderTxHash),
	}),
);

// ──────────────────────────────────────────────────────────────────────────────
// D. Per-event activity logs (one table per Bivium event)
//
// Reorg-safe: every row is keyed by (txHash, logIndex) so Ponder can drop and
// reinsert during a reorg without merge conflicts. Frontend uses these for
// per-market and per-user history feeds and for charts.
// ──────────────────────────────────────────────────────────────────────────────

export const borrows = onchainTable(
	"borrows",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		caller: t.hex().notNull(),
		onBehalf: t.hex().notNull(),
		receiver: t.hex().notNull(),
		assets: t.bigint().notNull(),
		shares: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		onBehalfIdx: index().on(table.onBehalf, table.timestamp),
	}),
);

export const repays = onchainTable(
	"repays",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		caller: t.hex().notNull(),
		onBehalf: t.hex().notNull(),
		assets: t.bigint().notNull(),
		shares: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		onBehalfIdx: index().on(table.onBehalf, table.timestamp),
	}),
);

export const supplies = onchainTable(
	"supplies",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		caller: t.hex().notNull(),
		onBehalf: t.hex().notNull(),
		assets: t.bigint().notNull(),
		shares: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		onBehalfIdx: index().on(table.onBehalf, table.timestamp),
	}),
);

export const withdrawals = onchainTable(
	"withdrawals",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		caller: t.hex().notNull(),
		onBehalf: t.hex().notNull(),
		receiver: t.hex().notNull(),
		assets: t.bigint().notNull(),
		shares: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		onBehalfIdx: index().on(table.onBehalf, table.timestamp),
	}),
);

export const supplyCollaterals = onchainTable(
	"supply_collaterals",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		caller: t.hex().notNull(),
		onBehalf: t.hex().notNull(),
		assets: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		onBehalfIdx: index().on(table.onBehalf, table.timestamp),
	}),
);

export const withdrawCollaterals = onchainTable(
	"withdraw_collaterals",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		caller: t.hex().notNull(),
		onBehalf: t.hex().notNull(),
		receiver: t.hex().notNull(),
		assets: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		onBehalfIdx: index().on(table.onBehalf, table.timestamp),
	}),
);

export const liquidations = onchainTable(
	"liquidations",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		liquidator: t.hex().notNull(),
		borrower: t.hex().notNull(),
		repaidAssets: t.bigint().notNull(),
		repaidShares: t.bigint().notNull(),
		seizedAssets: t.bigint().notNull(),
		badDebtAssets: t.bigint().notNull(),
		badDebtShares: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		marketIdx: index().on(table.marketId, table.timestamp),
		borrowerIdx: index().on(table.borrower, table.timestamp),
	}),
);

/**
 * `AutoForward` is the proof-of-loop-closure event: every successful repay /
 * liquidate auto-transfers idle supply back to the lender's EOA. Powers the
 * lender's "principal returned" feed cleanly without joining repays + markets.
 */
export const autoForwards = onchainTable(
	"auto_forwards",
	(t) => ({
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		marketId: t.hex().notNull(),
		creator: t.hex().notNull(),
		amount: t.bigint().notNull(),
		blockNumber: t.bigint().notNull(),
		timestamp: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
		creatorIdx: index().on(table.creator, table.timestamp),
		marketIdx: index().on(table.marketId, table.timestamp),
	}),
);
