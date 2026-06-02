import { Environment } from "@bivium/common";
import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["local", "development", "production"]).default("local"),
	DATABASE_URL: z.string().url(),
	LIFI_API_URL: z.string().url().default("https://li.quest/v1"),
	LIFI_API_KEY: z.string().optional(),
	LIFI_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
	PRICE_REFRESH_CRON: z.string().default("*/2 * * * *"),
});

export type JobsEnvSchema = z.infer<typeof schema>;

class JobsEnvironment extends Environment {
	private readonly values: JobsEnvSchema;

	constructor() {
		const parsed = schema.safeParse(process.env);
		if (!parsed.success) {
			throw new Error(`Invalid jobs environment: ${parsed.error.message}`);
		}
		super(parsed.data.NODE_ENV);
		this.values = parsed.data;
	}

	get databaseUrl(): string {
		return this.values.DATABASE_URL;
	}
	get lifiApiUrl(): string {
		return this.values.LIFI_API_URL;
	}
	get lifiApiKey(): string | undefined {
		return this.values.LIFI_API_KEY;
	}
	get lifiTimeoutMs(): number {
		return this.values.LIFI_TIMEOUT_MS;
	}
	get priceRefreshCron(): string {
		return this.values.PRICE_REFRESH_CRON;
	}
}

const environment = new JobsEnvironment();
export default environment;
