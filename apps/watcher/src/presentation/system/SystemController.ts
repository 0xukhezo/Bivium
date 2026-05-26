import { Api, COMMON_TYPES, type IEnvironment } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import type { Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class SystemController extends Api {
	constructor(
		@inject(COMMON_TYPES.Logger) logger: ILogger,
		@inject(COMMON_TYPES.Environment) environment: IEnvironment,
	) {
		super(logger, environment);
	}

	health = (_req: Request, res: Response): void => {
		this.send(res, { status: "ok", uptimeSec: process.uptime() }, 200);
	};
}
