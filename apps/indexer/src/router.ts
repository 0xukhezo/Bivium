import { ponder } from "ponder:registry";
import { fills, orders } from "ponder:schema";

import { lower } from "./lib/ids.js";

ponder.on("BiviumRouter:OrderFilled", async ({ event, context }) => {
	await context.db.insert(orders).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		borrower: lower(event.args.borrower),
		loanToken: lower(event.args.loanToken),
		collateralToken: lower(event.args.collateralToken),
		loanAmount: event.args.loanAmount,
		collateralAmount: event.args.collateralAmount,
		weightedAvgRate: event.args.weightedAvgRate,
		fillsCount: Number(event.args.fillsCount),
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});

ponder.on("BiviumRouter:Fill", async ({ event, context }) => {
	// Fill events are emitted inside the Router's borrow loop, BEFORE
	// OrderFilled. They share the same tx hash — use it as the foreign-key
	// pointer back to `orders` without enforcing a real FK (Ponder doesn't
	// model FKs, and the join is cheap on the indexed orderTxHash).
	await context.db.insert(fills).values({
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		orderTxHash: event.transaction.hash,
		borrower: lower(event.args.borrower),
		lender: lower(event.args.lender),
		loanToken: lower(event.args.loanToken),
		amount: event.args.amount,
		rate: event.args.rate,
		blockNumber: event.block.number,
		timestamp: event.block.timestamp,
	});
});
