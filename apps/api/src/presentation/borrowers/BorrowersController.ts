import {
	APPLICATION_TYPES,
	type GetBorrowerLoansQueryHandler,
} from "@bivium/application";
import {
	Api,
	COMMON_TYPES,
	HttpBadRequestError,
	type IEnvironment,
} from "@bivium/common";
import type { BorrowerLoansListDto } from "@bivium/common/dtos";
import type { ILogger } from "@bivium/common/logger";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";
import { z } from "zod";
import { mapHandlerOutputToResponse } from "./mappers/BorrowerLoansMapper.js";

// Lowercased on the indexer side, so we lowercase the input before matching.
// Accept mixed-case from the URL but normalize before the handler call.
const addressParamSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/u, "Invalid EVM address")
	.transform((s) => s.toLowerCase());

@injectable()
export class BorrowersController extends Api {
	constructor(
		@inject(COMMON_TYPES.Logger) logger: ILogger,
		@inject(COMMON_TYPES.Environment) environment: IEnvironment,
		@inject(APPLICATION_TYPES.GetBorrowerLoansQueryHandler)
		private readonly getBorrowerLoansQueryHandler: GetBorrowerLoansQueryHandler,
	) {
		super(logger, environment);
	}

	listBorrowerLoans = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const parsed = addressParamSchema.safeParse(req.params.address);
			if (!parsed.success) {
				throw new HttpBadRequestError(
					"Invalid borrower address",
					parsed.error.issues.map((i) => i.message),
				);
			}

			const output = await this.getBorrowerLoansQueryHandler.execute({
				borrower: parsed.data,
			});
			const body: BorrowerLoansListDto = mapHandlerOutputToResponse(output);
			this.send(res, body, 200);
		} catch (err) {
			next(err);
		}
	};
}
