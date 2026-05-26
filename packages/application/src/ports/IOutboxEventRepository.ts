import type { TransactionClient } from "./ITransactionManagerPort.js";

export type OutboxEventStatus =
	| "PENDING"
	| "PROCESSING"
	| "PUBLISHED"
	| "FAILED";

export interface OutboxEventRecord {
	id: string;
	exchange: string;
	routingKey: string;
	event: unknown;
	status: OutboxEventStatus;
	attempts: number;
	lastError: string | null;
	lastAttemptAt: Date | null;
	createdAt: Date;
}

export interface CreateOutboxEventInput {
	exchange: string;
	routingKey: string;
	event: unknown;
}

export interface IOutboxEventRepository {
	createInTransaction(
		tx: TransactionClient,
		input: CreateOutboxEventInput,
	): Promise<OutboxEventRecord>;

	findById(id: string): Promise<OutboxEventRecord | null>;

	/** Atomically marks N rows as PROCESSING and returns them. Uses FOR UPDATE SKIP LOCKED. */
	claimPending(limit: number): Promise<OutboxEventRecord[]>;

	/**
	 * Atomically transition PENDING → PROCESSING for a single id (CAS).
	 * Returns the claimed row, or `null` if the row no longer existed in `PENDING`
	 * (e.g. the poller grabbed it, or another flusher beat us to it).
	 */
	tryClaim(id: string): Promise<OutboxEventRecord | null>;

	markPublished(id: string): Promise<void>;

	markFailed(id: string, error: string): Promise<void>;

	/** Re-queues a failed row (status → PENDING, increments attempts). */
	resetToPending(id: string, error: string): Promise<void>;
}
