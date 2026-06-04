import "reflect-metadata";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { printAppInfo } from "@bivium/common/utils";
import { getPrismaClient } from "@bivium/infrastructure";
import schedule from "node-schedule";
import environment from "./env/jobs-environment.js";
import { container } from "./inversify.config.js";
import { updateAssetsPricesJob } from "./modules/assets/index.js";
import { syncLenderWebhookJob } from "./modules/webhooks/index.js";
import { registerJobs } from "./scheduler/launcher.js";

class App {
	private logger: ILogger;

	constructor() {
		this.logger = container.get<ILogger>(COMMON_TYPES.Logger);
	}

	async start(): Promise<void> {
		await getPrismaClient().$connect();
		this.logger.info("Prisma connected");

		const jobs = [updateAssetsPricesJob];
		if (syncLenderWebhookJob) jobs.push(syncLenderWebhookJob);
		registerJobs(jobs, this.logger);

		printAppInfo({
			name: "jobs",
			env: environment.getCurrentEnvironment(),
			details: {
				priceRefreshCron: environment.priceRefreshCron,
				lenderWebhookSyncCron: syncLenderWebhookJob
					? environment.lenderWebhookSyncCron
					: "disabled",
				registeredJobs: jobs.length,
			},
		});
	}

	async shutdown(): Promise<void> {
		this.logger.info("Shutting down jobs");
		try {
			await schedule.gracefulShutdown();
			this.logger.info("Scheduler stopped");
			await getPrismaClient().$disconnect();
			this.logger.info("Prisma disconnected");
			process.exit(0);
		} catch (err) {
			this.logger.error("Error during shutdown", {
				error: err instanceof Error ? err.message : String(err),
			});
			process.exit(1);
		}
	}
}

export default App;
