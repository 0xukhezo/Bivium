import { OnchainEvent, type OnchainEventProvider } from "@bivium/domain";
import type {
	OnchainEvent as PrismaOnchainEvent,
	OnchainEventProvider as PrismaProvider,
} from "../../generated/client/index.js";

export function mapPrismaOnchainEventToDomain(
	record: PrismaOnchainEvent,
): OnchainEvent {
	return new OnchainEvent({
		id: record.id,
		provider: record.provider as OnchainEventProvider,
		payload: record.payload,
		processed: record.processed,
		error: record.error,
		timesProcessed: record.timesProcessed,
		lastProcessedAt: record.lastProcessedAt,
		createdAt: record.createdAt,
	});
}

export function toPrismaProvider(p: OnchainEventProvider): PrismaProvider {
	return p as PrismaProvider;
}
