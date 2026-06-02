import type { ILogger } from "@bivium/common/logger";
import schedule from "node-schedule";
import type { JobDefinition } from "./job.contract.js";

export function registerJobs(jobs: JobDefinition[], logger: ILogger): void {
	for (const job of jobs) {
		schedule.scheduleJob(job.schedule, async () => {
			try {
				await job.handler();
			} catch (err) {
				logger.error("Job failed", {
					jobName: job.name,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		});
		logger.info("Job registered", { name: job.name, schedule: job.schedule });
	}
}
