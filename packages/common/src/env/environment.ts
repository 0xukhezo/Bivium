export type Environments = "local" | "development" | "production";

export interface IEnvironment {
	getCurrentEnvironment(): Environments;
	isProd(): boolean;
	isDev(): boolean;
	isLocal(): boolean;
}

export class Environment implements IEnvironment {
	constructor(private readonly env: Environments) {}

	getCurrentEnvironment(): Environments {
		return this.env;
	}

	isProd(): boolean {
		return this.env === "production";
	}

	isDev(): boolean {
		return this.env === "development";
	}

	isLocal(): boolean {
		return this.env === "local";
	}
}
