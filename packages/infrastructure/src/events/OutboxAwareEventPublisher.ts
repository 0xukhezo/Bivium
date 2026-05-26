import {
	APPLICATION_TYPES,
	type IEventPublisherPort,
	type IOutboxEventRepository,
	type IPostCommitFlusherPort,
	type IRabbitMQPublisherPort,
} from "@bivium/application";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { inject, injectable } from "inversify";
import { outboxFlushContext } from "../outbox/flushContext.js";

const DEFAULT_EXCHANGE = "bivium.events";

/**
 * Two-phase outbox publisher.
 *
 * **Phase 1 — inside caller's tx (`publish`):**
 *   - Writes an `OutboxEvent` row with status `PENDING` atomically with the
 *     caller's domain write. Records the row id in the current
 *     `outboxFlushContext` so the post-commit hook can attempt direct delivery.
 *
 * **Phase 2 — after caller's tx commits (`flush`, invoked by
 * `PrismaTransactionManager`):**
 *   - For each recorded id, CAS-claim the row (PENDING → PROCESSING).
 *   - Try direct publish via `IRabbitMQPublisherPort`.
 *   - On success: `markPublished`.
 *   - On failure: `resetToPending` (no `attempts++` — the background poller
 *     owns retry accounting).
 *   - If CAS fails (row no longer PENDING) the poller already grabbed it; skip.
 *
 * This gives us atomic outbox+domain writes (no phantom events on tx rollback)
 * AND happy-path latency near zero (no waiting for the poll interval). If the
 * direct attempt is short-circuited by a slow handler, app crash, or RabbitMQ
 * outage, the row sits `PENDING` and the poller delivers it eventually.
 */
@injectable()
export class OutboxAwareEventPublisher
	implements IEventPublisherPort, IPostCommitFlusherPort
{
	constructor(
		@inject(APPLICATION_TYPES.OutboxEventRepository)
		private readonly outboxRepo: IOutboxEventRepository,
		@inject(APPLICATION_TYPES.RabbitMQPublisher)
		private readonly rabbit: IRabbitMQPublisherPort,
		@inject(COMMON_TYPES.Logger)
		private readonly logger: ILogger,
	) {}

	async publish(
		routingKey: string,
		payload: unknown,
		tx: unknown,
	): Promise<void> {
		const row = await this.outboxRepo.createInTransaction(tx, {
			exchange: DEFAULT_EXCHANGE,
			routingKey,
			event: payload,
		});
		outboxFlushContext.record(row.id);
		this.logger.debug("[outbox] row written, recorded for post-commit flush", {
			id: row.id,
			routingKey,
		});
	}

	async flush(outboxIds: string[]): Promise<void> {
		if (outboxIds.length === 0) return;

		for (const id of outboxIds) {
			const claimed = await this.outboxRepo.tryClaim(id);
			if (!claimed) {
				continue;
			}

			try {
				await this.rabbit.publish(
					claimed.exchange,
					claimed.routingKey,
					claimed.event,
				);
				await this.outboxRepo.markPublished(id);
				this.logger.debug("[outbox] direct publish ok", {
					id,
					routingKey: claimed.routingKey,
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				this.logger.warning(
					"[outbox] direct publish failed, leaving PENDING for poller",
					{ id, routingKey: claimed.routingKey, error: message },
				);
				await this.outboxRepo.resetToPending(id, `direct: ${message}`);
			}
		}
	}
}
