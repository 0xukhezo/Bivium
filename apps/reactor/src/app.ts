import "reflect-metadata";
import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { printAppInfo } from "@bivium/common/utils";
import environment from "./env/reactor-environment.js";
import { container } from "./inversify.config.js";
import { subscriptions } from "./messaging/registry.js";
import { Subscriber } from "./messaging/Subscriber.js";

class App {
	private subscriber: Subscriber | null = null;

	async start(): Promise<void> {
		const logger = container.get<ILogger>(COMMON_TYPES.Logger);

		this.subscriber = new Subscriber(environment.rabbitmqUrl, logger);
		await this.subscriber.connect();

		for (const sub of subscriptions) {
			await this.subscriber.bind(sub);
		}

		printAppInfo({
			name: "reactor",
			env: environment.getCurrentEnvironment(),
			details: { subscriptions: subscriptions.length },
		});
		logger.info("Reactor ready", {
			subscriptions: subscriptions.map((s) => s.queue),
		});
	}

	async shutdown(): Promise<void> {
		const logger = container.get<ILogger>(COMMON_TYPES.Logger);
		logger.info("Shutting down reactor");
		try {
			if (this.subscriber) await this.subscriber.close();
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
