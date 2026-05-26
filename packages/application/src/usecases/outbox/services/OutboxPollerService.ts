import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { inject, injectable } from "inversify";
import type { IOutboxEventRepository } from "../../../ports/IOutboxEventRepository.js";
import type { IRabbitMQPublisherPort } from "../../../ports/IRabbitMQPublisherPort.js";
import { APPLICATION_TYPES } from "../../../types.js";

export interface OutboxPollerTickOptions {
	batchSize?: number;
	maxAttempts?: number;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;

@injectable()
export class OutboxPollerService {
	constructor(
		@inject(APPLICATION_TYPES.OutboxEventRepository)
		private readonly outboxRepo: IOutboxEventRepository,
		@inject(APPLICATION_TYPES.RabbitMQPublisher)
		private readonly rabbit: IRabbitMQPublisherPort,
		@inject(COMMON_TYPES.Logger)
		private readonly logger: ILogger,
	) {}

	async tick({
		batchSize = DEFAULT_BATCH_SIZE,
		maxAttempts = DEFAULT_MAX_ATTEMPTS,
	}: OutboxPollerTickOptions = {}): Promise<number> {
		const claimed = await this.outboxRepo.claimPending(batchSize);

		if (claimed.length === 0) return 0;

		this.logger.debug("[outbox-poller] claimed events", {
			count: claimed.length,
		});

		let succeeded = 0;
		let failed = 0;

		for (const row of claimed) {
			try {
				await this.rabbit.publish(row.exchange, row.routingKey, row.event);
				await this.outboxRepo.markPublished(row.id);
				succeeded++;
				this.logger.debug("[outbox-poller] published", {
					id: row.id,
					routingKey: row.routingKey,
				});
			} catch (err) {
				const message = stringifyErr(err);
				const newAttempts = row.attempts + 1;

				if (newAttempts >= maxAttempts) {
					await this.outboxRepo.markFailed(row.id, message);
					this.logger.error("[outbox-poller] failed (max attempts)", {
						id: row.id,
						attempts: newAttempts,
						error: message,
					});
				} else {
					await this.outboxRepo.resetToPending(row.id, message);
					this.logger.warning("[outbox-poller] publish failed, will retry", {
						id: row.id,
						attempts: newAttempts,
						error: message,
					});
				}
				failed++;
			}
		}

		if (failed > 0) {
			this.logger.warning("[outbox-poller] tick completed with failures", {
				total: claimed.length,
				succeeded,
				failed,
			});
		}

		return claimed.length;
	}
}

function stringifyErr(e: unknown): string {
	if (!e) return "unknown";
	if (typeof e === "string") return e.slice(0, 2000);
	if (e instanceof Error) return e.message.slice(0, 2000);
	try {
		return JSON.stringify(e).slice(0, 2000);
	} catch {
		return "unserializable error";
	}
}
