import {
	APPLICATION_TYPES,
	type SaveOnchainEventsCommandHandler,
} from "@bivium/application";
import { Api, COMMON_TYPES, type IEnvironment } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { type AlchemyWebhookPayload, OnchainEvent } from "@bivium/domain";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class WebhooksController extends Api {
	constructor(
		@inject(COMMON_TYPES.Logger) logger: ILogger,
		@inject(COMMON_TYPES.Environment) environment: IEnvironment,
		@inject(APPLICATION_TYPES.SaveOnchainEventsCommandHandler)
		private readonly saveOnchainEventsHandler: SaveOnchainEventsCommandHandler,
	) {
		super(logger, environment);
	}

	handleAlchemyWebhook = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const payload = req.body as AlchemyWebhookPayload;
			this.logger.info("Received Alchemy webhook", {
				webhookId: payload.webhookId,
				activityCount: payload.event?.activity?.length ?? 0,
			});

			await this.saveOnchainEventsHandler.execute({
				events: [OnchainEvent.createFromAlchemyWebhook(payload)],
			});

			this.send(res, "OK", 200);
		} catch (error) {
			next(error);
		}
	};
}
