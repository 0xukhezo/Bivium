import { AsyncLocalStorage } from "node:async_hooks";

interface FlushContext {
	ids: string[];
}

const storage = new AsyncLocalStorage<FlushContext>();

/**
 * Scoped collector of outbox row IDs written during a transaction.
 * `OutboxAwareEventPublisher.publish` records each id; the `PrismaTransactionManager`
 * drains and flushes them right after `$transaction` commits — so we get atomic
 * outbox+domain writes AND a low-latency direct delivery in the happy path.
 */
export const outboxFlushContext = {
	async run<T>(fn: () => Promise<T>): Promise<T> {
		return storage.run({ ids: [] }, fn);
	},
	record(id: string): void {
		// If called outside `run()` (no current tx), silently drop — the row is
		// safely persisted as PENDING and the background poller will deliver it.
		// This makes the publisher usable from non-tx code paths too (rare, but
		// e.g. backfill scripts).
		storage.getStore()?.ids.push(id);
	},
	drain(): string[] {
		const ctx = storage.getStore();
		if (!ctx) return [];
		const ids = ctx.ids;
		ctx.ids = [];
		return ids;
	},
};
