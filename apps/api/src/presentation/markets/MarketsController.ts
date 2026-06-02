import {
	APPLICATION_TYPES,
	type GetMarketSummariesQueryHandler,
} from "@bivium/application";
import { Api, COMMON_TYPES, type IEnvironment } from "@bivium/common";
import type { MarketsListDto } from "@bivium/common/dtos";
import type { ILogger } from "@bivium/common/logger";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";
import { mapHandlerOutputToResponse } from "./mappers/MarketSummaryMapper.js";

@injectable()
export class MarketsController extends Api {
	constructor(
		@inject(COMMON_TYPES.Logger) logger: ILogger,
		@inject(COMMON_TYPES.Environment) environment: IEnvironment,
		@inject(APPLICATION_TYPES.GetMarketSummariesQueryHandler)
		private readonly getMarketSummariesQueryHandler: GetMarketSummariesQueryHandler,
	) {
		super(logger, environment);
	}

	listMarkets = async (
		_req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const output = await this.getMarketSummariesQueryHandler.execute({});
			const body: MarketsListDto = mapHandlerOutputToResponse(output);
			this.send(res, body, 200);
		} catch (err) {
			next(err);
		}
	};
}
