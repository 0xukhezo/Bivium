import type {
	OnchainEvent,
	OnchainEventProps,
} from "../entities/OnchainEvent.js";

export interface IOnchainEventRepository {
	create(event: Omit<OnchainEventProps, "id">): Promise<OnchainEvent>;
	createInTransaction(
		tx: unknown,
		event: Omit<OnchainEventProps, "id">,
	): Promise<OnchainEvent>;
	findById(id: string): Promise<OnchainEvent | null>;
	markProcessedInTransaction(tx: unknown, id: string): Promise<void>;
	markFailedInTransaction(tx: unknown, id: string): Promise<void>;
}
