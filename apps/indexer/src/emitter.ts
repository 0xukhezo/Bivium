import { eq } from "drizzle-orm";
import { ponder } from "ponder:registry";
import {
	lenderCollaterals,
	lenderRates,
	lenders,
} from "ponder:schema";

import { lower } from "./lib/ids.js";

// ── Lender lifecycle ──

ponder.on("BiviumEventEmitter:LenderRegistered", async ({ event, context }) => {
	const address = lower(event.args.lender);
	await context.db
		.insert(lenders)
		.values({
			address,
			paused: false,
			firstSeenBlock: event.block.number,
			firstSeenTimestamp: event.block.timestamp,
			lastUpdatedBlock: event.block.number,
		})
		.onConflictDoNothing();
});

ponder.on("BiviumEventEmitter:Paused", async ({ event, context }) => {
	const address = lower(event.args.lender);
	// `LenderRegistered` always precedes Paused in the contract (emitRegister is
	// called from `_ensureRegistered` before any state-changing op), so the row
	// must exist by here — but onConflictDoUpdate guards against any reorg
	// reorder edge case where Paused replays before Register.
	await context.db
		.insert(lenders)
		.values({
			address,
			paused: true,
			firstSeenBlock: event.block.number,
			firstSeenTimestamp: event.block.timestamp,
			lastUpdatedBlock: event.block.number,
		})
		.onConflictDoUpdate(() => ({
			paused: true,
			lastUpdatedBlock: event.block.number,
		}));
});

ponder.on("BiviumEventEmitter:Unpaused", async ({ event, context }) => {
	const address = lower(event.args.lender);
	await context.db
		.insert(lenders)
		.values({
			address,
			paused: false,
			firstSeenBlock: event.block.number,
			firstSeenTimestamp: event.block.timestamp,
			lastUpdatedBlock: event.block.number,
		})
		.onConflictDoUpdate(() => ({
			paused: false,
			lastUpdatedBlock: event.block.number,
		}));
});

// ── Rates ──

ponder.on("BiviumEventEmitter:RateSet", async ({ event, context }) => {
	const lender = lower(event.args.lender);
	const loanToken = lower(event.args.loanToken);
	await context.db
		.insert(lenderRates)
		.values({
			lender,
			loanToken,
			ratePerSecond: event.args.ratePerSecond,
			updatedAtBlock: event.block.number,
			updatedAtTimestamp: event.block.timestamp,
		})
		.onConflictDoUpdate(() => ({
			ratePerSecond: event.args.ratePerSecond,
			updatedAtBlock: event.block.number,
			updatedAtTimestamp: event.block.timestamp,
		}));
});

// ── Collateral whitelist ──

ponder.on(
	"BiviumEventEmitter:AllowedCollateralsSet",
	async ({ event, context }) => {
		const lender = lower(event.args.lender);
		// Bulk replace: the contract clears the lender's full whitelist and
		// installs the new array. The indexer mirrors that with a bulk update
		// (set allowed=false for everything this lender ever had) followed by
		// upserts of the new set. Drizzle escape hatch via `context.db.sql` is
		// required because the Store API only supports point updates by PK.
		await context.db.sql
			.update(lenderCollaterals)
			.set({
				allowed: false,
				updatedAtBlock: event.block.number,
			})
			.where(eq(lenderCollaterals.lender, lender));

		for (const collateral of event.args.collaterals) {
			await context.db
				.insert(lenderCollaterals)
				.values({
					lender,
					collateral: lower(collateral),
					allowed: true,
					updatedAtBlock: event.block.number,
				})
				.onConflictDoUpdate(() => ({
					allowed: true,
					updatedAtBlock: event.block.number,
				}));
		}
	},
);

ponder.on(
	"BiviumEventEmitter:AllowedCollateralAdded",
	async ({ event, context }) => {
		await context.db
			.insert(lenderCollaterals)
			.values({
				lender: lower(event.args.lender),
				collateral: lower(event.args.collateral),
				allowed: true,
				updatedAtBlock: event.block.number,
			})
			.onConflictDoUpdate(() => ({
				allowed: true,
				updatedAtBlock: event.block.number,
			}));
	},
);

ponder.on(
	"BiviumEventEmitter:AllowedCollateralRemoved",
	async ({ event, context }) => {
		await context.db
			.insert(lenderCollaterals)
			.values({
				lender: lower(event.args.lender),
				collateral: lower(event.args.collateral),
				allowed: false,
				updatedAtBlock: event.block.number,
			})
			.onConflictDoUpdate(() => ({
				allowed: false,
				updatedAtBlock: event.block.number,
			}));
	},
);

// ── Intentionally not indexed from the Emitter ──
//
// MarketCreated      — redundant with Bivium:CreateMarket (same tx, full params).
// FulfilledBorrow    — redundant with Bivium:Supply (same tx, onBehalf == lender).
// WithdrawnFromMarket — redundant with Bivium:Withdraw (same tx, escape hatch).
// Initialized        — one-time deploy event, no state to track.
