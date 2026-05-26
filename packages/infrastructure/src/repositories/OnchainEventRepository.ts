import type {
	IOnchainEventRepository,
	OnchainEvent,
	OnchainEventProps,
} from "@bivium/domain";
import { injectable } from "inversify";
import type { Prisma } from "../../generated/client/index.js";
import {
	mapPrismaOnchainEventToDomain,
	toPrismaProvider,
} from "../mappers/OnchainEventMapper.js";
import { BaseRepository } from "./BaseRepository.js";

@injectable()
export class OnchainEventRepository
	extends BaseRepository
	implements IOnchainEventRepository
{
	async create(event: Omit<OnchainEventProps, "id">): Promise<OnchainEvent> {
		const record = await this.prisma.onchainEvent.create({
			data: this.#toPrismaCreateData(event),
		});
		return mapPrismaOnchainEventToDomain(record);
	}

	async createInTransaction(
		tx: unknown,
		event: Omit<OnchainEventProps, "id">,
	): Promise<OnchainEvent> {
		const client = tx as Prisma.TransactionClient;
		const record = await client.onchainEvent.create({
			data: this.#toPrismaCreateData(event),
		});
		return mapPrismaOnchainEventToDomain(record);
	}

	async findById(id: string): Promise<OnchainEvent | null> {
		const record = await this.prisma.onchainEvent.findUnique({ where: { id } });
		return record ? mapPrismaOnchainEventToDomain(record) : null;
	}

	async markProcessedInTransaction(tx: unknown, id: string): Promise<void> {
		const client = tx as Prisma.TransactionClient;
		await client.onchainEvent.update({
			where: { id },
			data: {
				processed: true,
				error: false,
				lastProcessedAt: new Date(),
				timesProcessed: { increment: 1 },
			},
		});
	}

	async markFailedInTransaction(tx: unknown, id: string): Promise<void> {
		const client = tx as Prisma.TransactionClient;
		await client.onchainEvent.update({
			where: { id },
			data: {
				error: true,
				lastProcessedAt: new Date(),
				timesProcessed: { increment: 1 },
			},
		});
	}

	#toPrismaCreateData(event: Omit<OnchainEventProps, "id">) {
		return {
			provider: toPrismaProvider(event.provider),
			payload: event.payload as Prisma.InputJsonValue,
			processed: event.processed,
			error: event.error,
			timesProcessed: event.timesProcessed,
			lastProcessedAt: event.lastProcessedAt,
			createdAt: event.createdAt,
		};
	}
}
