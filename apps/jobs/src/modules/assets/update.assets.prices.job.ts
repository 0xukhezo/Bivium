import {
	APPLICATION_TYPES,
	type UpdateAssetPricesCommandHandler,
} from "@bivium/application";
import environment from "../../env/jobs-environment.js";
import { container } from "../../inversify.config.js";
import { logger } from "../../logger/logger.js";
import type { JobDefinition } from "../../scheduler/job.contract.js";

const NAME = "assets:update-prices";

let isRunning = false;

export const updateAssetsPricesJob: JobDefinition = {
	name: NAME,
	schedule: environment.priceRefreshCron,
	handler: async () => {
		if (isRunning) {
			logger.debug("[assets:update-prices] previous tick still running, skip");
			return;
		}
		isRunning = true;
		try {
			const handler = container.get<UpdateAssetPricesCommandHandler>(
				APPLICATION_TYPES.UpdateAssetPricesCommandHandler,
			);
			await handler.execute({});
		} finally {
			isRunning = false;
		}
	},
};
