import "reflect-metadata";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import {
	APPLICATION_TYPES,
	type IRabbitMQPublisherPort,
} from "@bivium/application";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { printAppInfo } from "@bivium/common/utils";
import { getPrismaClient } from "@bivium/infrastructure";
import cors from "cors";
import express, { type Request } from "express";
import helmet from "helmet";
import environment from "./env/watcher-environment.js";
import { container } from "./inversify.config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { OutboxPollerRunner } from "./outbox/OutboxPollerRunner.js";
import routes from "./presentation/routes/index.js";

function addRawBody(
	req: IncomingMessage,
	_res: ServerResponse,
	buf: Buffer,
	encoding: BufferEncoding,
): void {
	(req as Request).rawBody = buf.toString(encoding || "utf8");
}

class App {
	public readonly express: express.Application;
	private server?: Server;
	private outboxRunner?: OutboxPollerRunner;

	constructor() {
		this.express = express();
		this.express.disable("x-powered-by");
		this.express.use(cors());
		this.express.use(helmet());
		this.express.use(express.json({ verify: addRawBody }));
		this.express.use(express.urlencoded({ extended: true }));
		this.express.use(`/api/${environment.apiVersion}`, routes);
		this.express.use(errorHandler());
	}

	async start(): Promise<void> {
		const logger = container.get<ILogger>(COMMON_TYPES.Logger);

		await getPrismaClient().$connect();
		logger.info("Prisma connected");

		this.outboxRunner = new OutboxPollerRunner(container, logger, {
			intervalMs: environment.outboxPollIntervalMs,
			batchSize: environment.outboxBatchSize,
			maxAttempts: environment.outboxMaxAttempts,
		});
		this.outboxRunner.start();

		this.server = this.express.listen(environment.port, () => {
			const url = `http://localhost:${environment.port}/api/${environment.apiVersion}`;
			printAppInfo({
				name: "watcher",
				env: environment.getCurrentEnvironment(),
				details: { port: environment.port, api: url },
			});
			logger.info("Watcher listening", { port: environment.port });
		});
	}

	async shutdown(): Promise<void> {
		const logger = container.get<ILogger>(COMMON_TYPES.Logger);
		logger.info("Shutting down watcher");
		try {
			if (this.server) {
				await new Promise<void>((resolve) =>
					this.server?.close(() => resolve()),
				);
				logger.info("HTTP server closed");
			}
			if (this.outboxRunner) {
				await this.outboxRunner.stop();
				logger.info("Outbox poller stopped");
			}
			const publisher = container.get<IRabbitMQPublisherPort>(
				APPLICATION_TYPES.RabbitMQPublisher,
			);
			await publisher.close();
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
