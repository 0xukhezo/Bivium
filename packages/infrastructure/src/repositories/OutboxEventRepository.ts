import type {
	CreateOutboxEventInput,
	IOutboxEventRepository,
	OutboxEventRecord,
	OutboxEventStatus,
} from "@bivium/application";
import { injectable } from "inversify";
import type { Prisma } from "../../generated/client/index.js";
import { BaseRepository } from "./BaseRepository.js";

interface OutboxEventRow {
	id: string;
	exchange: string;
	routing_key: string;
	event: unknown;
	status: OutboxEventStatus;
	attempts: number;
	last_error: string | null;
	last_attempt_at: Date | null;
	created_at: Date;
}

function rowToRecord(row: OutboxEventRow): OutboxEventRecord {
	return {
		id: row.id,
		exchange: row.exchange,
		routingKey: row.routing_key,
		event: row.event,
		status: row.status,
		attempts: row.attempts,
		lastError: row.last_error,
		lastAttemptAt: row.last_attempt_at,
		createdAt: row.created_at,
	};
}

@injectable()
export class OutboxEventRepository
	extends BaseRepository
	implements IOutboxEventRepository
{
	async createInTransaction(
		tx: unknown,
		input: CreateOutboxEventInput,
	): Promise<OutboxEventRecord> {
		const client = tx as Prisma.TransactionClient;
		const record = await client.outboxEvent.create({
			data: {
				exchange: input.exchange,
				routingKey: input.routingKey,
				event: input.event as Prisma.InputJsonValue,
			},
		});
		return {
			id: record.id,
			exchange: record.exchange,
			routingKey: record.routingKey,
			event: record.event,
			status: record.status as OutboxEventStatus,
			attempts: record.attempts,
			lastError: record.lastError,
			lastAttemptAt: record.lastAttemptAt,
			createdAt: record.createdAt,
		};
	}

	async findById(id: string): Promise<OutboxEventRecord | null> {
		const record = await this.prisma.outboxEvent.findUnique({ where: { id } });
		if (!record) return null;
		return {
			id: record.id,
			exchange: record.exchange,
			routingKey: record.routingKey,
			event: record.event,
			status: record.status as OutboxEventStatus,
			attempts: record.attempts,
			lastError: record.lastError,
			lastAttemptAt: record.lastAttemptAt,
			createdAt: record.createdAt,
		};
	}

	async tryClaim(id: string): Promise<OutboxEventRecord | null> {
		// CAS: only claim if still PENDING. Returns the row, or empty if someone beat us.
		const rows = await this.prisma.$queryRawUnsafe<OutboxEventRow[]>(
			`UPDATE "outbox_events"
       SET status = 'PROCESSING',
           "last_attempt_at" = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING id, exchange, routing_key, event, status, attempts, last_error, last_attempt_at, created_at`,
			id,
		);
		return rows.length > 0 ? rowToRecord(rows[0]) : null;
	}

	async claimPending(limit: number): Promise<OutboxEventRecord[]> {
		// Atomic claim using FOR UPDATE SKIP LOCKED so multiple pollers can run.
		const rows = await this.prisma.$queryRawUnsafe<OutboxEventRow[]>(
			`UPDATE "outbox_events"
       SET status = 'PROCESSING',
           "last_attempt_at" = NOW()
       WHERE id IN (
         SELECT id FROM "outbox_events"
         WHERE status IN ('PENDING','FAILED')
         ORDER BY "created_at"
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, exchange, routing_key, event, status, attempts, last_error, last_attempt_at, created_at`,
			limit,
		);
		return rows.map(rowToRecord);
	}

	async markPublished(id: string): Promise<void> {
		await this.prisma.outboxEvent.update({
			where: { id },
			data: { status: "PUBLISHED" },
		});
	}

	async markFailed(id: string, error: string): Promise<void> {
		await this.prisma.outboxEvent.update({
			where: { id },
			data: {
				status: "FAILED",
				lastError: error,
				attempts: { increment: 1 },
			},
		});
	}

	async resetToPending(id: string, error: string): Promise<void> {
		await this.prisma.outboxEvent.update({
			where: { id },
			data: {
				status: "PENDING",
				lastError: error,
				attempts: { increment: 1 },
			},
		});
	}
}
