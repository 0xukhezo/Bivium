import {
	APPLICATION_TYPES,
	type SyncLenderWebhookAddressesCommandHandler,
} from "@bivium/application";
import environment from "../../env/jobs-environment.js";
import { container } from "../../inversify.config.js";
import { logger } from "../../logger/logger.js";
import type { JobDefinition } from "../../scheduler/job.contract.js";

const NAME = "webhooks:sync-lender-addresses";

let isRunning = false;

/**
 * Diff-syncs the Alchemy address-activity webhook with `indexer.lenders` so
 * every lender that has registered on chain gets balance-update webhooks.
 *
 * Re-entrancy guard: a tick that takes longer than the cron interval is
 * silently skipped on the next fire. The handler reads-then-adds, so a
 * concurrent tick would race the GET and double-PATCH — but `addAddresses`
 * is idempotent per Alchemy, so the worst case is a duplicate (no-op) call.
 *
 * Returns `null` from the export when the operator hasn't configured the
 * Alchemy notify token / webhook id, so the launcher can skip registration
 * without crashing the rest of the jobs app.
 */
export const syncLenderWebhookJob: JobDefinition | null = (() => {
	if (!environment.alchemyNotifyAuthToken || !environment.alchemyWebhookId) {
		logger.warning(
			"[webhooks:sync-lender-addresses] disabled — set ALCHEMY_NOTIFY_AUTH_TOKEN and ALCHEMY_WEBHOOK_ID to enable",
		);
		return null;
	}
	return {
		name: NAME,
		schedule: environment.lenderWebhookSyncCron,
		handler: async () => {
			if (isRunning) {
				logger.debug(
					"[webhooks:sync-lender-addresses] previous tick still running, skip",
				);
				return;
			}
			isRunning = true;
			try {
				const handler = container.get<SyncLenderWebhookAddressesCommandHandler>(
					APPLICATION_TYPES.SyncLenderWebhookAddressesCommandHandler,
				);
				await handler.execute({});
			} finally {
				isRunning = false;
			}
		},
	};
})();
