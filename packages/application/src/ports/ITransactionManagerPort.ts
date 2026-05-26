/**
 * Opaque transaction client. Implementations pass the underlying ORM tx
 * (Prisma's `tx` from `$transaction`) without leaking its type into the
 * application layer.
 */
export type TransactionClient = unknown;

export interface ITransactionManagerPort {
	runInTransaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}
