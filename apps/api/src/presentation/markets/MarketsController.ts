import {
	APPLICATION_TYPES,
	type GetMarketDepthQueryHandler,
	type GetMarketSummariesQueryHandler,
} from "@bivium/application";
import {
	Api,
	COMMON_TYPES,
	HttpBadRequestError,
	HttpNotFoundError,
	type IEnvironment,
} from "@bivium/common";
import type { MarketDepthDto, MarketsListDto } from "@bivium/common/dtos";
import type { ILogger } from "@bivium/common/logger";
import { ResourceNotFoundError } from "@bivium/domain";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";
import { z } from "zod";
import { mapHandlerOutputToResponse as mapDepthToResponse } from "./mappers/MarketDepthMapper.js";
import { mapHandlerOutputToResponse as mapSummariesToResponse } from "./mappers/MarketSummaryMapper.js";

const addressParamSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid EVM address")
	.transform((s) => s.toLowerCase());

@injectable()
export class MarketsController extends Api {
	constructor(
		@inject(COMMON_TYPES.Logger) logger: ILogger,
		@inject(COMMON_TYPES.Environment) environment: IEnvironment,
		@inject(APPLICATION_TYPES.GetMarketSummariesQueryHandler)
		private readonly getMarketSummariesQueryHandler: GetMarketSummariesQueryHandler,
		@inject(APPLICATION_TYPES.GetMarketDepthQueryHandler)
		private readonly getMarketDepthQueryHandler: GetMarketDepthQueryHandler,
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
			const body: MarketsListDto = mapSummariesToResponse(output);
			this.send(res, body, 200);
		} catch (err) {
			next(err);
		}
	};

	getMarketDepth = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const collateral = addressParamSchema.safeParse(req.params.collateral);
			const loan = addressParamSchema.safeParse(req.params.loan);
			if (!collateral.success || !loan.success) {
				const rawErrors: string[] = [];
				if (!collateral.success) rawErrors.push("Invalid collateral address");
				if (!loan.success) rawErrors.push("Invalid loan address");
				throw new HttpBadRequestError("Invalid pair address", rawErrors);
			}

			const output = await this.getMarketDepthQueryHandler.execute({
				collateral: collateral.data,
				loan: loan.data,
			});
			const body: MarketDepthDto = mapDepthToResponse(output);
			this.send(res, body, 200);
		} catch (err) {
			if (err instanceof ResourceNotFoundError) {
				next(new HttpNotFoundError("Pair not curated"));
				return;
			}
			next(err);
		}
	};
}
