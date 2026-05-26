import { Environment } from "@bivium/common";
import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["local", "development", "production"]).default("local"),
	DATABASE_URL: z.string().url(),
	RABBITMQ_URL: z.string().url(),
	ALCHEMY_API_KEY: z.string().min(1),
});

export type ReactorEnvSchema = z.infer<typeof schema>;

class ReactorEnvironment extends Environment {
	private values: ReactorEnvSchema;

	constructor() {
		const parsed = schema.safeParse(process.env);
		if (!parsed.success) {
			throw new Error(`Invalid reactor environment: ${parsed.error.message}`);
		}
		super(parsed.data.NODE_ENV);
		this.values = parsed.data;
	}

	get databaseUrl(): string {
		return this.values.DATABASE_URL;
	}
	get rabbitmqUrl(): string {
		return this.values.RABBITMQ_URL;
	}
	get alchemyApiKey(): string {
		return this.values.ALCHEMY_API_KEY;
	}
}

const environment = new ReactorEnvironment();
export default environment;
