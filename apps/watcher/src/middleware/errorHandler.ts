import { ApiError, ServiceError } from "@bivium/common";
import type { NextFunction, Request, Response } from "express";
import environment from "../env/watcher-environment.js";
import { logger } from "../logger/logger.js";

interface ErrorBody {
	success: false;
	message: string;
	rawErrors?: string[];
	stack?: string;
}

export const errorHandler = () => {
	return (err: Error, req: Request, res: Response, _next: NextFunction) => {
		logger.error("Request error", {
			path: req.path,
			method: req.method,
			errorMessage: err.message,
			stack: err.stack,
		});

		const exposeDetails = environment.isDev() || environment.isLocal();
		const body: ErrorBody = {
			success: false,
			message: exposeDetails ? err.message : "Internal Server Error",
			stack: exposeDetails ? err.stack : undefined,
		};

		let statusCode = 500;
		if (err instanceof ServiceError) {
			statusCode = 400;
		} else if (err instanceof ApiError) {
			statusCode = err.statusCode;
			if (err.rawErrors) body.rawErrors = err.rawErrors;
		}

		res.status(statusCode).json(body);
	};
};
