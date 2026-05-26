import { Environment } from "@bivium/common";
import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["local", "development", "production"]).default("local"),
	WATCHER_PORT: z.coerce.number().int().positive().default(3001),
	API_VERSION: z.string().default("v1"),
	DATABASE_URL: z.string().url(),
	RABBITMQ_URL: z.string().url(),
	ALCHEMY_SIGNING_KEY: z.string().min(1),
	ALCHEMY_API_KEY: z.string().min(1),
	OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
	OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(50),
	OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
});

export type WatcherEnvSchema = z.infer<typeof schema>;

class WatcherEnvironment extends Environment {
	private values: WatcherEnvSchema;

	constructor() {
		const parsed = schema.safeParse(process.env);
		if (!parsed.success) {
			throw new Error(`Invalid watcher environment: ${parsed.error.message}`);
		}
		super(parsed.data.NODE_ENV);
		this.values = parsed.data;
	}

	get port(): number {
		return this.values.WATCHER_PORT;
	}
	get apiVersion(): string {
		return this.values.API_VERSION;
	}
	get databaseUrl(): string {
		return this.values.DATABASE_URL;
	}
	get rabbitmqUrl(): string {
		return this.values.RABBITMQ_URL;
	}
	get alchemySigningKey(): string {
		return this.values.ALCHEMY_SIGNING_KEY;
	}
	get alchemyApiKey(): string {
		return this.values.ALCHEMY_API_KEY;
	}
	get outboxPollIntervalMs(): number {
		return this.values.OUTBOX_POLL_INTERVAL_MS;
	}
	get outboxBatchSize(): number {
		return this.values.OUTBOX_BATCH_SIZE;
	}
	get outboxMaxAttempts(): number {
		return this.values.OUTBOX_MAX_ATTEMPTS;
	}
}

const environment = new WatcherEnvironment();
export default environment;
