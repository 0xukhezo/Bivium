import { ponder } from "ponder:registry";
import {
	autoForwards,
	borrows,
	liquidations,
	markets,
	positions,
	repays,
	supplies,
	supplyCollaterals,
	tokens,
	withdrawCollaterals,
	withdrawals,
} from "ponder:schema";

import { lower } from "./lib/ids.js";

// ──────────────────────────────────────────────────────────────────────────────
// Curated token registry (TokenConfigSet / TokenConfigRemoved)
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:TokenConfigSet", async ({ event, context }) => {
	const address = lower(event.args.token);
	await context.db
		.insert(tokens)
		.values({
			address,
			oracle: lower(event.args.oracle),
			lltv: event.args.lltv,
			active: true,
			updatedAtBlock: event.block.number,
		})
		.onConflictDoUpdate(() => ({
			oracle: lower(event.args.oracle),
			lltv: event.args.lltv,
			active: true,
			updatedAtBlock: event.block.number,
		}));
});

ponder.on("Bivium:TokenConfigRemoved", async ({ event, context }) => {
	const address = lower(event.args.token);
	// Don't delete: existing markets keep the old (oracle, lltv) tuple. Flag
	// inactive so the orderbook frontend can hide it from new borrows while the
	// historical context (which oracle this market trusts) stays queryable.
	await context.db
		.update(tokens, { address })
		.set({ active: false, updatedAtBlock: event.block.number });
});

// ──────────────────────────────────────────────────────────────────────────────
// Markets (CreateMarket)
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:CreateMarket", async ({ event, context }) => {
	const id = event.args.id;
	const p = event.args.marketParams;
	await context.db
		.insert(markets)
		.values({
			id,
			loanToken: lower(p.loanToken),
			collateralToken: lower(p.collateralToken),
			oracle: lower(p.oracle),
			ratePerSecond: p.ratePerSecond,
			lltv: p.lltv,
			creator: lower(p.creator),
			totalSupplyAssets: 0n,
			totalSupplyShares: 0n,
			totalBorrowAssets: 0n,
			totalBorrowShares: 0n,
			lastAccrualTimestamp: event.block.timestamp,
			createdAtBlock: event.block.number,
			createdAtTimestamp: event.block.timestamp,
		})
		.onConflictDoNothing();
});

// ──────────────────────────────────────────────────────────────────────────────
// Supply / Withdraw (lender side of the JIT loop)
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:Supply", async ({ event, context }) => {
	const marketId = event.args.id;
	await context.db.update(markets, { id: marketId }).set((row) => ({
		totalSupplyAssets: row.totalSupplyAssets + event.args.assets,
		totalSupplyShares: row.totalSupplyShares + event.args.shares,
	}));
	await context.db.insert(supplies).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		caller: lower(event.args.caller),
		onBehalf: lower(event.args.onBehalf),
		assets: event.args.assets,
		shares: event.args.shares,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

ponder.on("Bivium:Withdraw", async ({ event, context }) => {
	const marketId = event.args.id;
	await context.db.update(markets, { id: marketId }).set((row) => ({
		totalSupplyAssets: row.totalSupplyAssets - event.args.assets,
		totalSupplyShares: row.totalSupplyShares - event.args.shares,
	}));
	await context.db.insert(withdrawals).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		caller: lower(event.args.caller),
		onBehalf: lower(event.args.onBehalf),
		receiver: lower(event.args.receiver),
		assets: event.args.assets,
		shares: event.args.shares,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// Borrow / Repay (borrower-side debt accounting)
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:Borrow", async ({ event, context }) => {
	const marketId = event.args.id;
	const borrower = lower(event.args.onBehalf);

	await context.db.update(markets, { id: marketId }).set((row) => ({
		totalBorrowAssets: row.totalBorrowAssets + event.args.assets,
		totalBorrowShares: row.totalBorrowShares + event.args.shares,
	}));

	await context.db
		.insert(positions)
		.values({
			marketId,
			borrower,
			borrowShares: event.args.shares,
			collateral: 0n,
			lastUpdatedBlock: event.block.number,
		})
		.onConflictDoUpdate((row) => ({
			borrowShares: row.borrowShares + event.args.shares,
			lastUpdatedBlock: event.block.number,
		}));

	await context.db.insert(borrows).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		caller: lower(event.args.caller),
		onBehalf: borrower,
		receiver: lower(event.args.receiver),
		assets: event.args.assets,
		shares: event.args.shares,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

ponder.on("Bivium:Repay", async ({ event, context }) => {
	const marketId = event.args.id;
	const borrower = lower(event.args.onBehalf);

	await context.db.update(markets, { id: marketId }).set((row) => ({
		totalBorrowAssets: row.totalBorrowAssets - event.args.assets,
		totalBorrowShares: row.totalBorrowShares - event.args.shares,
	}));

	// Position must exist if there was anything to repay; using update (not
	// upsert) so a logic bug surfaces loudly instead of being papered over.
	await context.db
		.update(positions, { marketId, borrower })
		.set((row) => ({
			borrowShares: row.borrowShares - event.args.shares,
			lastUpdatedBlock: event.block.number,
		}));

	await context.db.insert(repays).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		caller: lower(event.args.caller),
		onBehalf: borrower,
		assets: event.args.assets,
		shares: event.args.shares,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// Collateral movements
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:SupplyCollateral", async ({ event, context }) => {
	const marketId = event.args.id;
	const borrower = lower(event.args.onBehalf);

	await context.db
		.insert(positions)
		.values({
			marketId,
			borrower,
			borrowShares: 0n,
			collateral: event.args.assets,
			lastUpdatedBlock: event.block.number,
		})
		.onConflictDoUpdate((row) => ({
			collateral: row.collateral + event.args.assets,
			lastUpdatedBlock: event.block.number,
		}));

	await context.db.insert(supplyCollaterals).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		caller: lower(event.args.caller),
		onBehalf: borrower,
		assets: event.args.assets,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

ponder.on("Bivium:WithdrawCollateral", async ({ event, context }) => {
	const marketId = event.args.id;
	const borrower = lower(event.args.onBehalf);

	await context.db
		.update(positions, { marketId, borrower })
		.set((row) => ({
			collateral: row.collateral - event.args.assets,
			lastUpdatedBlock: event.block.number,
		}));

	await context.db.insert(withdrawCollaterals).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		caller: lower(event.args.caller),
		onBehalf: borrower,
		receiver: lower(event.args.receiver),
		assets: event.args.assets,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// Liquidations (and the bad-debt path)
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:Liquidate", async ({ event, context }) => {
	const marketId = event.args.id;
	const borrower = lower(event.args.borrower);

	await context.db
		.update(positions, { marketId, borrower })
		.set((row) => ({
			borrowShares: row.borrowShares - event.args.repaidShares,
			collateral: row.collateral - event.args.seizedAssets,
			lastUpdatedBlock: event.block.number,
		}));

	// Bad debt: Morpho writes off the unredeemable principal proportionally
	// across suppliers. For a mono-lender Bivium market that's just the
	// creator's bag — but the totals must drop accordingly so APYs stay sane.
	await context.db.update(markets, { id: marketId }).set((row) => ({
		totalBorrowAssets: row.totalBorrowAssets - event.args.repaidAssets,
		totalBorrowShares: row.totalBorrowShares - event.args.repaidShares,
		totalSupplyAssets:
			row.totalSupplyAssets - event.args.badDebtAssets,
		totalSupplyShares:
			row.totalSupplyShares - event.args.badDebtShares,
	}));

	await context.db.insert(liquidations).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId,
		liquidator: lower(event.args.caller),
		borrower,
		repaidAssets: event.args.repaidAssets,
		repaidShares: event.args.repaidShares,
		seizedAssets: event.args.seizedAssets,
		badDebtAssets: event.args.badDebtAssets,
		badDebtShares: event.args.badDebtShares,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// Auto-forward (lender's principal returns to their EOA — the JIT loop closure)
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:AutoForward", async ({ event, context }) => {
	await context.db.insert(autoForwards).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		marketId: event.args.id,
		creator: lower(event.args.creator),
		amount: event.args.amount,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// Interest accrual — keep market totals fresh so the API doesn't have to ask
// the chain on every read.
// ──────────────────────────────────────────────────────────────────────────────

ponder.on("Bivium:AccrueInterest", async ({ event, context }) => {
	// In Morpho Blue without a protocol fee, accrued interest is fully credited
	// to suppliers: both totalBorrowAssets and totalSupplyAssets grow by the
	// same `interest` amount. Bivium inherits this directly.
	await context.db.update(markets, { id: event.args.id }).set((row) => ({
		totalBorrowAssets: row.totalBorrowAssets + event.args.interest,
		totalSupplyAssets: row.totalSupplyAssets + event.args.interest,
		lastAccrualTimestamp: event.block.timestamp,
	}));
});
