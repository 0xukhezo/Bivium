/**
 * Triggers an immediate (best-effort) delivery for outbox rows that were
 * written during the just-committed transaction. Implementations CAS-claim
 * each row to avoid racing the background poller, attempt RabbitMQ publish,
 * and mark `PUBLISHED` on success. Failures silently leave the row `PENDING`
 * for the poller to retry — never throws.
 */
export interface IPostCommitFlusherPort {
	flush(outboxIds: string[]): Promise<void>;
}
