import {
	APPLICATION_TYPES,
	type UpdateBalanceHistoryCommandHandler,
} from "@bivium/application";
import type { ILogger } from "@bivium/common/logger";
import { container } from "../../inversify.config.js";
import {
	type UserBalanceRefreshPayload,
	UserBalanceRefreshSchema,
} from "./schema.js";

export async function onUserBalanceRefresh(
	rawPayload: unknown,
	logger: ILogger,
): Promise<void> {
	const parsed: UserBalanceRefreshPayload =
		UserBalanceRefreshSchema.parse(rawPayload);

	logger.info("Processing user.balance.refresh", {
		address: parsed.address,
		chainId: parsed.chainId,
	});

	const handler = container.get<UpdateBalanceHistoryCommandHandler>(
		APPLICATION_TYPES.UpdateBalanceHistoryCommandHandler,
	);

	const result = await handler.execute({
		chainId: parsed.chainId,
		addresses: [parsed.address],
	});

	logger.info("Finished user.balance.refresh", {
		address: parsed.address,
		...result,
	});
}
