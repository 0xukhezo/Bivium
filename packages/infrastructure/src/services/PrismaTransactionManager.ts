import {
	APPLICATION_TYPES,
	type IPostCommitFlusherPort,
	type ITransactionManagerPort,
} from "@bivium/application";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { inject, injectable } from "inversify";
import { outboxFlushContext } from "../outbox/flushContext.js";
import {
	type PrismaClient,
	getPrismaClient,
} from "../prisma/prisma-client-factory.js";

/**
 * Wraps `prisma.$transaction` and, after commit succeeds, drains any outbox
 * row ids that the publisher recorded during the tx and asks the post-commit
 * flusher to attempt direct RabbitMQ delivery. The flush is best-effort —
 * any failure leaves the row PENDING for the background poller, the caller
 * never sees an error from it.
 */
@injectable()
export class PrismaTransactionManager implements ITransactionManagerPort {
	private readonly prisma: PrismaClient;

	constructor(
		@inject(APPLICATION_TYPES.PostCommitFlusher)
		private readonly postCommitFlusher: IPostCommitFlusherPort,
		@inject(COMMON_TYPES.Logger)
		private readonly logger: ILogger,
	) {
		this.prisma = getPrismaClient();
	}

	async runInTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
		return outboxFlushContext.run(async () => {
			const result = await this.prisma.$transaction((tx) => fn(tx));
			const ids = outboxFlushContext.drain();
			this.logger.debug("[tx] committed; outbox ids to flush", {
				count: ids.length,
			});
			if (ids.length > 0) {
				try {
					await this.postCommitFlusher.flush(ids);
				} catch (err) {
					// Flusher should never throw, but guard anyway — poller will recover.
					this.logger.warning("[outbox] post-commit flush threw, falling back to poller", {
						error: err instanceof Error ? err.message : String(err),
						idCount: ids.length,
					});
				}
			}
			return result;
		});
	}
}
