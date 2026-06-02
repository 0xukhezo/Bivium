import { Environment } from "@bivium/common";
import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["local", "development", "production"]).default("local"),
	API_PORT: z.coerce.number().int().positive().default(3000),
	API_VERSION: z.string().default("v1"),
	DATABASE_URL: z.string().url(),
	CORS_ORIGINS: z.string().optional(),
});

export type ApiEnvSchema = z.infer<typeof schema>;

class ApiEnvironment extends Environment {
	private readonly values: ApiEnvSchema;

	constructor() {
		const parsed = schema.safeParse(process.env);
		if (!parsed.success) {
			throw new Error(`Invalid api environment: ${parsed.error.message}`);
		}
		super(parsed.data.NODE_ENV);
		this.values = parsed.data;
	}

	get port(): number {
		return this.values.API_PORT;
	}
	get apiVersion(): string {
		return this.values.API_VERSION;
	}
	get databaseUrl(): string {
		return this.values.DATABASE_URL;
	}
	/** Comma-separated origin list. Empty = allow all (dev). */
	get corsOrigins(): string[] {
		if (!this.values.CORS_ORIGINS) return [];
		return this.values.CORS_ORIGINS.split(",")
			.map((o) => o.trim())
			.filter(Boolean);
	}
}

const environment = new ApiEnvironment();
export default environment;
