import "reflect-metadata";
import type { Server } from "node:http";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { printAppInfo } from "@bivium/common/utils";
import { getPrismaClient } from "@bivium/infrastructure";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import environment from "./env/api-environment.js";
import { container } from "./inversify.config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./presentation/routes.js";

class App {
	public readonly express: express.Application;
	private server?: Server;

	constructor() {
		this.express = express();
		this.express.disable("x-powered-by");
		this.express.use(this.buildCors());
		this.express.use(helmet());
		this.express.use(express.json());
		this.express.use(express.urlencoded({ extended: true }));
		this.express.use(`/api/${environment.apiVersion}`, routes);
		this.express.use(errorHandler());
	}

	private buildCors() {
		const allowed = environment.corsOrigins;
		if (allowed.length === 0) return cors();
		return cors({
			origin: (origin, callback) => {
				if (!origin) return callback(null, true);
				if (allowed.includes(origin)) return callback(null, true);
				return callback(new Error("Origin not allowed by CORS"));
			},
			credentials: true,
		});
	}

	async start(): Promise<void> {
		const logger = container.get<ILogger>(COMMON_TYPES.Logger);

		await getPrismaClient().$connect();
		logger.info("Prisma connected");

		this.server = this.express.listen(environment.port, () => {
			const url = `http://localhost:${environment.port}/api/${environment.apiVersion}`;
			printAppInfo({
				name: "api",
				env: environment.getCurrentEnvironment(),
				details: { port: environment.port, api: url },
			});
			logger.info("API listening", { port: environment.port });
		});
	}

	async shutdown(): Promise<void> {
		const logger = container.get<ILogger>(COMMON_TYPES.Logger);
		logger.info("Shutting down api");
		try {
			if (this.server) {
				await new Promise<void>((resolve) =>
					this.server?.close(() => resolve()),
				);
				logger.info("HTTP server closed");
			}
			await getPrismaClient().$disconnect();
			logger.info("Prisma disconnected");
			process.exit(0);
		} catch (err) {
			logger.error("Error during shutdown", {
				error: err instanceof Error ? err.message : String(err),
			});
			process.exit(1);
		}
	}
}

export default App;
