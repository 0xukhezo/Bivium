import {
	APPLICATION_TYPES,
	type OutboxPollerService,
} from "@bivium/application";
import type { ILogger } from "@bivium/common/logger";
import type { Container } from "inversify";

export interface OutboxPollerRunnerOptions {
	intervalMs: number;
	batchSize: number;
	maxAttempts: number;
}

/**
 * Periodically invokes `OutboxPollerService.tick()` while preventing overlap
 * (a slow tick won't trigger a parallel one). Stops cleanly on shutdown.
 */
export class OutboxPollerRunner {
	private timer: NodeJS.Timeout | null = null;
	private running = false;
	private stopped = false;

	constructor(
		private readonly container: Container,
		private readonly logger: ILogger,
		private readonly options: OutboxPollerRunnerOptions,
	) {}

	start(): void {
		if (this.timer) return;
		this.logger.info("Starting outbox poller", {
			intervalMs: this.options.intervalMs,
			batchSize: this.options.batchSize,
		});
		this.timer = setInterval(() => this.safeTick(), this.options.intervalMs);
	}

	async stop(): Promise<void> {
		this.stopped = true;
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		// best-effort wait for in-flight tick to finish (max 5s)
		const deadline = Date.now() + 5000;
		while (this.running && Date.now() < deadline) {
			await new Promise((r) => setTimeout(r, 50));
		}
	}

	private async safeTick(): Promise<void> {
		if (this.running || this.stopped) return;
		this.running = true;
		try {
			const poller = this.container.get<OutboxPollerService>(
				APPLICATION_TYPES.OutboxPollerService,
			);
			await poller.tick({
				batchSize: this.options.batchSize,
				maxAttempts: this.options.maxAttempts,
			});
		} catch (err) {
			this.logger.error("Outbox poller tick crashed", {
				error: err instanceof Error ? err.message : String(err),
			});
		} finally {
			this.running = false;
		}
	}
}
