import {
	APPLICATION_TYPES,
	type GetLenderMarketsQueryHandler,
} from "@bivium/application";
import {
	Api,
	COMMON_TYPES,
	HttpBadRequestError,
	type IEnvironment,
} from "@bivium/common";
import type { LenderMarketsListDto } from "@bivium/common/dtos";
import type { ILogger } from "@bivium/common/logger";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";
import { z } from "zod";
import { mapHandlerOutputToResponse } from "./mappers/LenderMarketsMapper.js";

// Lowercased on the indexer side, so we lowercase the input before matching.
// Accept mixed-case from the URL but normalize before the handler call.
const addressParamSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid EVM address")
	.transform((s) => s.toLowerCase());

@injectable()
export class LenderMarketsController extends Api {
	constructor(
		@inject(COMMON_TYPES.Logger) logger: ILogger,
		@inject(COMMON_TYPES.Environment) environment: IEnvironment,
		@inject(APPLICATION_TYPES.GetLenderMarketsQueryHandler)
		private readonly getLenderMarketsQueryHandler: GetLenderMarketsQueryHandler,
	) {
		super(logger, environment);
	}

	listLenderMarkets = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const parsed = addressParamSchema.safeParse(req.params.address);
			if (!parsed.success) {
				throw new HttpBadRequestError(
					"Invalid lender address",
					parsed.error.issues.map((i) => i.message),
				);
			}

			const output = await this.getLenderMarketsQueryHandler.execute({
				lender: parsed.data,
			});
			const body: LenderMarketsListDto = mapHandlerOutputToResponse(output);
			this.send(res, body, 200);
		} catch (err) {
			next(err);
		}
	};
}
