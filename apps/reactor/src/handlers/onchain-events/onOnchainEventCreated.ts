import {
	APPLICATION_TYPES,
	type ProcessOnchainEventCommandHandler,
} from "@bivium/application";
import type { ILogger } from "@bivium/common/logger";
import { container } from "../../inversify.config.js";
import {
	OnchainEventCreatedSchema,
	type OnchainEventCreatedPayload,
} from "./schema.js";

export async function onOnchainEventCreated(
	rawPayload: unknown,
	logger: ILogger,
): Promise<void> {
	const parsed: OnchainEventCreatedPayload =
		OnchainEventCreatedSchema.parse(rawPayload);

	logger.info("Processing onchain.event.created", {
		onchainEventId: parsed.onchainEventId,
	});

	const handler = container.get<ProcessOnchainEventCommandHandler>(
		APPLICATION_TYPES.ProcessOnchainEventCommandHandler,
	);

	const result = await handler.execute({
		onchainEventId: parsed.onchainEventId,
	});

	logger.info("Finished onchain.event.created", {
		onchainEventId: parsed.onchainEventId,
		...result,
	});
}
